package middleware

import (
	"crypto/rand"
	"encoding/hex"
	"log/slog"
	stdpath "path"
	"strings"

	"github.com/gofiber/fiber/v2"
)

// csrfExemptPaths are public POST endpoints that don't have auth cookies yet,
// or fire-and-forget endpoints where CSRF protection adds no value.
var csrfExemptPaths = []string{
	"/api/v1/auth/login",
	"/api/v1/auth/register",
	"/api/v1/auth/refresh",
	"/api/v1/auth/forgot-password",
	"/api/v1/auth/reset-password",
	"/api/v1/auth/logout",
	"/api/v1/csrf-token",
	// Analytics and error reporting: fire-and-forget, no user state mutations.
	// navigator.sendBeacon cannot attach custom headers, so CSRF tokens are
	// impossible to send. These endpoints are already rate-limited.
	"/api/v1/analytics/pageview",
	"/api/v1/errors/report",
}

const csrfTokenLength = 32
const csrfCookieName = "porjar_csrf"
const csrfHeaderName = "X-CSRF-Token"

// generateCSRFToken generates a secure random token
func generateCSRFToken() (string, error) {
	bytes := make([]byte, csrfTokenLength)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

// CSRFMiddleware implements Double Submit Cookie pattern.
// It sets a CSRF token in a non-HttpOnly cookie (readable by JS)
// and requires the same token in X-CSRF-Token header for mutations.
func CSRFMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Skip CSRF for GET, HEAD, OPTIONS (safe methods)
		method := c.Method()
		if method == "GET" || method == "HEAD" || method == "OPTIONS" {
			return c.Next()
		}

		// Skip CSRF for public auth endpoints (no cookies available yet)
		path := stdpath.Clean(c.Path())
		for _, exempt := range csrfExemptPaths {
			if strings.EqualFold(path, exempt) {
				return c.Next()
			}
		}

		// Skip for API endpoints using Bearer token (JWT already provides CSRF protection
		// because cross-origin JS can't read the Authorization header value).
		authHeader := c.Get("Authorization")
		if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
			return c.Next()
		}

		// Skip when no auth cookie exists — CSRF attacks only work when
		// cookies are automatically sent. No cookie = nothing to protect.
		if c.Cookies("access_token") == "" {
			return c.Next()
		}

		// For cookie-based requests, validate CSRF token
		cookieToken := c.Cookies(csrfCookieName)
		headerToken := c.Get(csrfHeaderName)

		if cookieToken == "" || headerToken == "" || cookieToken != headerToken {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"success": false,
				"error": fiber.Map{
					"code":    "CSRF_TOKEN_INVALID",
					"message": "Request tidak valid (CSRF protection)",
				},
			})
		}

		return c.Next()
	}
}

// SetCSRFToken sets a CSRF token cookie if one does not already exist.
// Apply this on GET requests so the cookie is available before the first mutation.
// Pass secureCookie=true in production (HTTPS) and false in dev (HTTP).
func SetCSRFToken(secureCookie ...bool) fiber.Handler {
	secure := true // default to secure (production)
	if len(secureCookie) > 0 {
		secure = secureCookie[0]
	}
	return func(c *fiber.Ctx) error {
		if c.Method() == "GET" && c.Cookies(csrfCookieName) == "" {
			token, err := generateCSRFToken()
			if err != nil {
				slog.Warn("failed to generate CSRF token", "error", err)
				return c.Next()
			}
			c.Cookie(&fiber.Cookie{
				Name:     csrfCookieName,
				Value:    token,
				Path:     "/",
				MaxAge:   86400, // 24 hours
				Secure:   secure,
				HTTPOnly: false, // Must be readable by JS
				SameSite: "Strict",
			})
		}
		return c.Next()
	}
}
