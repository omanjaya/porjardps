package handler

import (
	"bytes"
	"fmt"
	"image"
	_ "image/gif"
	"image/jpeg"
	"image/png"
	"io"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/response"
)

type UploadHandler struct {
	uploadDir     string
	uploadMaxSize int
	uploadBaseURL string
}

func NewUploadHandler(uploadDir string, uploadMaxSize int, uploadBaseURL string) *UploadHandler {
	return &UploadHandler{
		uploadDir:     uploadDir,
		uploadMaxSize: uploadMaxSize,
		uploadBaseURL: strings.TrimRight(uploadBaseURL, "/"),
	}
}

// allowedMimeTypes maps allowed MIME types to their file extensions.
// File selalu dikirim sebagai WebP dari client (sudah dikompresi di browser),
// tapi kita tetap terima format lain sebagai fallback.
var allowedMimeTypes = map[string]string{
	"image/jpeg": ".jpg",
	"image/png":  ".png",
	"image/webp": ".webp",
	"image/gif":  ".gif",
}

func (h *UploadHandler) Upload(c *fiber.Ctx) error {
	fileHeader, err := c.FormFile("file")
	if err != nil {
		return response.BadRequest(c, "File tidak ditemukan dalam request")
	}

	// Validate file size
	if fileHeader.Size > int64(h.uploadMaxSize) {
		return response.Err(c, apperror.New(
			"FILE_TOO_LARGE",
			fmt.Sprintf("Ukuran file maksimal %d MB", h.uploadMaxSize/(1024*1024)),
			400,
		))
	}

	// Open the file to detect content type
	file, err := fileHeader.Open()
	if err != nil {
		slog.Error("failed to open uploaded file", "error", err)
		return response.Err(c, apperror.ErrInternal)
	}
	defer file.Close()

	// Read first 512 bytes to detect MIME type from content
	buf := make([]byte, 512)
	n, err := file.Read(buf)
	if err != nil && err != io.EOF {
		slog.Error("failed to read uploaded file", "error", err)
		return response.Err(c, apperror.ErrInternal)
	}

	mimeType := http.DetectContentType(buf[:n])

	ext, ok := allowedMimeTypes[mimeType]
	if !ok {
		return response.Err(c, apperror.New(
			"INVALID_FILE_TYPE",
			"Tipe file tidak didukung. Gunakan JPEG, PNG, atau WebP",
			400,
		))
	}

	// Reset file reader to beginning for image decode validation
	if _, err := file.Seek(0, io.SeekStart); err != nil {
		slog.Error("failed to seek uploaded file", "error", err)
		return response.Err(c, apperror.ErrInternal)
	}

	// Secondary validation: decode the full image structure to reject files that
	// merely have valid magic bytes but contain malicious payloads after the header.
	// Note: image/gif and image/webp may fall back to a best-effort decode; for
	// WebP files (not covered by standard library) we skip this check gracefully.
	if mimeType == "image/jpeg" || mimeType == "image/png" || mimeType == "image/gif" {
		if _, _, decodeErr := image.Decode(file); decodeErr != nil {
			return response.Err(c, apperror.New(
				"INVALID_IMAGE",
				"File gambar tidak valid atau rusak",
				fiber.StatusBadRequest,
			))
		}
		// Reset again after decode so we can copy the full content
		if _, err := file.Seek(0, io.SeekStart); err != nil {
			slog.Error("failed to seek uploaded file after decode", "error", err)
			return response.Err(c, apperror.ErrInternal)
		}
	}

	// Strip EXIF metadata by re-encoding JPEG/PNG images.
	// Re-encoding produces a clean image without any embedded metadata.
	var strippedBuf *bytes.Buffer
	if mimeType == "image/jpeg" || mimeType == "image/png" {
		if _, err := file.Seek(0, io.SeekStart); err != nil {
			slog.Error("failed to seek file for EXIF stripping", "error", err)
			return response.Err(c, apperror.ErrInternal)
		}
		img, format, decErr := image.Decode(file)
		if decErr == nil {
			stripped := new(bytes.Buffer)
			var encErr error
			switch format {
			case "jpeg":
				encErr = jpeg.Encode(stripped, img, &jpeg.Options{Quality: 90})
			case "png":
				encErr = png.Encode(stripped, img)
			}
			if encErr != nil {
				slog.Error("failed to re-encode image for EXIF stripping", "error", encErr, "format", format)
				return response.Err(c, apperror.ErrInternal)
			}
			strippedBuf = stripped
		} else {
			slog.Warn("skipping EXIF strip: could not decode image", "error", decErr)
		}
	}

	// Ensure upload directory exists
	if err := os.MkdirAll(h.uploadDir, 0o755); err != nil {
		slog.Error("failed to create upload directory", "error", err, "dir", h.uploadDir)
		return response.Err(c, apperror.ErrInternal)
	}

	// Generate UUID filename
	filename := uuid.New().String() + ext
	destPath := filepath.Join(h.uploadDir, filename)

	// Create destination file with restrictive permissions (owner read/write only)
	dst, err := os.OpenFile(destPath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0o600)
	if err != nil {
		slog.Error("failed to create destination file", "error", err, "path", destPath)
		return response.Err(c, apperror.ErrInternal)
	}
	defer dst.Close()

	// Copy file content — use stripped (EXIF-free) image if available
	var src io.Reader
	if strippedBuf != nil {
		src = strippedBuf
	} else {
		src = file
	}
	if _, err := io.Copy(dst, src); err != nil {
		slog.Error("failed to write uploaded file", "error", err)
		// Clean up partial file
		os.Remove(destPath)
		return response.Err(c, apperror.ErrInternal)
	}

	url := h.uploadBaseURL + "/" + filename

	return response.Created(c, fiber.Map{
		"url":       url,
		"filename":  filename,
		"size":      fileHeader.Size,
		"mime_type": mimeType,
	})
}
