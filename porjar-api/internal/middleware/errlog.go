package middleware

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"runtime/debug"

	"github.com/gofiber/fiber/v2"

	"github.com/porjar-denpasar/porjar-api/internal/pkg/errlog"
)

// ErrorLogger captures 500-class responses and panics, writing a structured
// entry to storage/errors.log (via the errlog package). It also assigns a
// request id header (X-Request-ID) used for correlation.
func ErrorLogger() fiber.Handler {
	return func(c *fiber.Ctx) (err error) {
		// Assign request id if the client did not supply one.
		rid := c.Get("X-Request-ID")
		if rid == "" {
			var buf [8]byte
			_, _ = rand.Read(buf[:])
			rid = hex.EncodeToString(buf[:])
		}
		c.Set("X-Request-ID", rid)
		c.Locals("request_id", rid)

		defer func() {
			if r := recover(); r != nil {
				stack := string(debug.Stack())
				errlog.Log(c.UserContext(), fmt.Errorf("panic: %v", r), "panic", map[string]any{
					"request_id": rid,
					"path":       c.Path(),
					"method":     c.Method(),
					"stack":      stack,
					"user_id":    fmt.Sprintf("%v", c.Locals("userID")),
				})
				err = c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"error":      "internal server error",
					"request_id": rid,
				})
			}
		}()

		err = c.Next()

		status := c.Response().StatusCode()
		if status >= 500 {
			meta := map[string]any{
				"request_id": rid,
				"path":       c.Path(),
				"method":     c.Method(),
				"status":     status,
				"ip":         c.IP(),
				"user_id":    fmt.Sprintf("%v", c.Locals("userID")),
			}
			if err != nil {
				errlog.Log(c.UserContext(), err, "error", meta)
			} else {
				errlog.Log(c.UserContext(), fmt.Errorf("http %d", status), "error", meta)
			}
		}
		return err
	}
}
