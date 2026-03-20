package middleware

import (
	"errors"
	"log/slog"

	"github.com/gofiber/fiber/v2"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
)

func ErrorHandler(c *fiber.Ctx, err error) error {
	// Check for Fiber errors (404, etc.)
	var fiberErr *fiber.Error
	if errors.As(err, &fiberErr) {
		return c.Status(fiberErr.Code).JSON(fiber.Map{
			"success": false,
			"error": fiber.Map{
				"code":    "HTTP_ERROR",
				"message": fiberErr.Message,
			},
		})
	}

	// Check for app errors
	var appErr *apperror.AppError
	if errors.As(err, &appErr) {
		return c.Status(appErr.HTTPStatus).JSON(fiber.Map{
			"success": false,
			"error": fiber.Map{
				"code":    appErr.Code,
				"message": appErr.Message,
				"details": appErr.Details,
			},
		})
	}

	// Unknown error
	slog.Error("unhandled error", "error", err, "path", c.Path())
	return c.Status(500).JSON(fiber.Map{
		"success": false,
		"error": fiber.Map{
			"code":    "INTERNAL_ERROR",
			"message": "Terjadi kesalahan pada server, coba lagi nanti",
		},
	})
}
