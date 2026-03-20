package middleware

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/redis/go-redis/v9"
)

func RateLimiter(rdb *redis.Client, maxRequests int) fiber.Handler {
	return func(c *fiber.Ctx) error {
		ip := c.IP()
		key := fmt.Sprintf("rate_limit:%s", ip)
		ctx := context.Background()
		window := time.Minute

		// Use pipeline: INCR + ExpireNX (only sets TTL on first request in window)
		pipe := rdb.Pipeline()
		incrCmd := pipe.Incr(ctx, key)
		pipe.ExpireNX(ctx, key, window)
		if _, err := pipe.Exec(ctx); err != nil {
			// If Redis fails, allow the request (fail open for availability)
			slog.Warn("rate limiter: Redis unavailable, failing open", "error", err, "ip", ip)
			return c.Next()
		}

		count := incrCmd.Val()

		if count > int64(maxRequests) {
			ttl, _ := rdb.TTL(ctx, key).Result()
			c.Set("Retry-After", fmt.Sprintf("%d", int(ttl.Seconds())))
			return c.Status(429).JSON(fiber.Map{
				"success": false,
				"error": fiber.Map{
					"code":    "RATE_LIMIT_EXCEEDED",
					"message": "Terlalu banyak permintaan, coba lagi nanti",
				},
			})
		}

		c.Set("X-RateLimit-Limit", fmt.Sprintf("%d", maxRequests))
		c.Set("X-RateLimit-Remaining", fmt.Sprintf("%d", int64(maxRequests)-count))

		return c.Next()
	}
}

// EndpointRateLimiter is a configurable per-IP rate limiter for a named endpoint.
// keyPrefix should be unique per endpoint (e.g. "register_attempts", "forgot_password_attempts").
func EndpointRateLimiter(rdb *redis.Client, keyPrefix string, maxAttempts int, window time.Duration) fiber.Handler {
	return func(c *fiber.Ctx) error {
		ip := c.IP()
		key := fmt.Sprintf("%s:%s", keyPrefix, ip)
		ctx := context.Background()

		pipe := rdb.Pipeline()
		incrCmd := pipe.Incr(ctx, key)
		pipe.ExpireNX(ctx, key, window)
		if _, err := pipe.Exec(ctx); err != nil {
			slog.Warn("endpoint rate limiter: Redis unavailable, failing open", "error", err, "ip", ip, "endpoint", keyPrefix)
			return c.Next()
		}

		count := incrCmd.Val()

		if count > int64(maxAttempts) {
			ttl, _ := rdb.TTL(ctx, key).Result()
			c.Set("Retry-After", fmt.Sprintf("%d", int(ttl.Seconds())))
			return c.Status(429).JSON(fiber.Map{
				"success": false,
				"error": fiber.Map{
					"code":        "RATE_LIMIT_EXCEEDED",
					"message":     "Terlalu banyak permintaan, coba lagi nanti",
					"retry_after": int(ttl.Seconds()),
				},
			})
		}

		return c.Next()
	}
}

// LoginRateLimiter is specifically for login endpoint with per-email limiting
func LoginRateLimiter(rdb *redis.Client, maxAttempts int) fiber.Handler {
	return func(c *fiber.Ctx) error {
		ip := c.IP()
		key := fmt.Sprintf("login_attempts:%s", ip)
		ctx := context.Background()
		window := 5 * time.Minute

		// Use pipeline: INCR + ExpireNX (only sets TTL on first request in window)
		pipe := rdb.Pipeline()
		incrCmd := pipe.Incr(ctx, key)
		pipe.ExpireNX(ctx, key, window)
		if _, err := pipe.Exec(ctx); err != nil {
			slog.Warn("login rate limiter: Redis unavailable, failing open", "error", err, "ip", ip)
			return c.Next()
		}

		count := incrCmd.Val()

		if count > int64(maxAttempts) {
			ttl, _ := rdb.TTL(ctx, key).Result()
			return c.Status(429).JSON(fiber.Map{
				"success": false,
				"error": fiber.Map{
					"code":        "RATE_LIMIT_EXCEEDED",
					"message":     "Terlalu banyak percobaan login, coba lagi nanti",
					"retry_after": int(ttl.Seconds()),
				},
			})
		}

		return c.Next()
	}
}
