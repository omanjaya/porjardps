package middleware

import (
	"github.com/gofiber/fiber/v2"
)

func SecurityHeaders() fiber.Handler {
	return func(c *fiber.Ctx) error {
		c.Set("X-Content-Type-Options", "nosniff")
		c.Set("X-Frame-Options", "DENY")
		c.Set("X-XSS-Protection", "0")
		c.Set("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
		c.Set("Content-Security-Policy", "default-src 'self'; img-src 'self' data: https: blob:; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' ws: wss: http: https:; font-src 'self' data:; frame-ancestors 'none';")
		return c.Next()
	}
}
