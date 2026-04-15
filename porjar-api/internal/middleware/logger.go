package middleware

import (
	"log/slog"
	"time"

	"github.com/gofiber/fiber/v2"
)

func Logger() fiber.Handler {
	return func(c *fiber.Ctx) error {
		start := time.Now()

		err := c.Next()

		status := c.Response().StatusCode()
		args := []any{
			"method", c.Method(),
			"path", c.Path(),
			"status", status,
			"latency", time.Since(start).String(),
			"ip", c.IP(),
		}

		// Differentiate log level by status code so 4xx/5xx stand out in log streams.
		switch {
		case status >= 500:
			slog.Error("request", args...)
		case status >= 400:
			slog.Warn("request", args...)
		default:
			slog.Info("request", args...)
		}

		return err
	}
}
