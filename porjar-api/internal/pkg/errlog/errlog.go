// Package errlog provides a lightweight file-based error logger with daily
// rotation. It is intentionally dependency-free (stdlib only) and safe for
// concurrent use. Logs are written as JSON lines to make grep/jq review easy.
package errlog

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"sync"
	"time"
)

const (
	defaultDir    = "/app/storage"
	errorFileName = "errors.log"
	clientFile    = "client_errors.log"
	keepDays      = 7
)

var (
	mu        sync.Mutex
	lastDay   string
	baseDir   = defaultDir
)

// SetDir overrides the default storage directory (useful for tests / local dev).
func SetDir(dir string) {
	mu.Lock()
	defer mu.Unlock()
	baseDir = dir
}

func filePath(name string) string {
	return filepath.Join(baseDir, name)
}

// rotateIfNeeded renames errors.log -> errors.log.YYYY-MM-DD when the day
// changes, and deletes rotated files older than keepDays.
func rotateIfNeeded(name string) {
	today := time.Now().Format("2006-01-02")
	if lastDay == "" {
		lastDay = today
	}
	if today == lastDay {
		return
	}
	// Rotate: rename current file to dated suffix.
	cur := filePath(name)
	if _, err := os.Stat(cur); err == nil {
		rotated := cur + "." + lastDay
		_ = os.Rename(cur, rotated)
	}
	lastDay = today

	// Cleanup old rotations (keep last N days).
	entries, err := os.ReadDir(baseDir)
	if err != nil {
		return
	}
	cutoff := time.Now().AddDate(0, 0, -keepDays)
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		n := e.Name()
		if len(n) < len(name)+11 || n[:len(name)] != name {
			continue
		}
		info, err := e.Info()
		if err != nil {
			continue
		}
		if info.ModTime().Before(cutoff) {
			_ = os.Remove(filepath.Join(baseDir, n))
		}
	}
}

// writeLine appends a single JSON line to the named log file.
func writeLine(name string, payload map[string]any) error {
	mu.Lock()
	defer mu.Unlock()

	if err := os.MkdirAll(baseDir, 0o755); err != nil {
		return err
	}
	rotateIfNeeded(name)

	f, err := os.OpenFile(filePath(name), os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0o600)
	if err != nil {
		return err
	}
	defer f.Close()

	b, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	_, err = fmt.Fprintln(f, string(b))
	return err
}

// Log writes a structured error entry. ctx may carry request_id / user_id
// values stored under the keys "request_id" and "user_id".
func Log(ctx context.Context, err error, level string, meta map[string]any) {
	payload := map[string]any{
		"timestamp": time.Now().UTC().Format(time.RFC3339Nano),
		"level":     level,
	}
	if err != nil {
		payload["error"] = err.Error()
	}
	if ctx != nil {
		if v, ok := ctx.Value(ctxKey("request_id")).(string); ok && v != "" {
			payload["request_id"] = v
		}
		if v, ok := ctx.Value(ctxKey("user_id")).(string); ok && v != "" {
			payload["user_id"] = v
		}
		if v, ok := ctx.Value(ctxKey("path")).(string); ok && v != "" {
			payload["path"] = v
		}
	}
	for k, v := range meta {
		payload[k] = v
	}
	if werr := writeLine(errorFileName, payload); werr != nil {
		slog.Warn("errlog write failed", "error", werr)
	}
}

// LogClient appends a client-reported error to client_errors.log.
func LogClient(entry map[string]any) error {
	if entry == nil {
		entry = map[string]any{}
	}
	entry["received_at"] = time.Now().UTC().Format(time.RFC3339Nano)
	return writeLine(clientFile, entry)
}

// LogAnalytics appends a page-view entry to analytics.log.
func LogAnalytics(entry map[string]any) error {
	if entry == nil {
		entry = map[string]any{}
	}
	entry["received_at"] = time.Now().UTC().Format(time.RFC3339Nano)
	return writeLine("analytics.log", entry)
}

// ctxKey is a private type to avoid collisions when storing values in context.
type ctxKey string

// WithRequestID returns a new context with the request id set.
func WithRequestID(ctx context.Context, id string) context.Context {
	return context.WithValue(ctx, ctxKey("request_id"), id)
}

// WithUserID returns a new context with the user id set.
func WithUserID(ctx context.Context, id string) context.Context {
	return context.WithValue(ctx, ctxKey("user_id"), id)
}

// WithPath returns a new context with the request path set.
func WithPath(ctx context.Context, p string) context.Context {
	return context.WithValue(ctx, ctxKey("path"), p)
}
