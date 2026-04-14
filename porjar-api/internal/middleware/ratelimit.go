package middleware

import (
	"context"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/redis/go-redis/v9"
)

// inMemoryBucket holds a counter + expiry protected by its own mutex for the fallback store.
type inMemoryBucket struct {
	mu     sync.Mutex
	count  int64
	expiry time.Time
}

// inMemoryStore is a package-level sync.Map used as a fallback when Redis is unavailable.
// Keys map to *inMemoryBucket.
var inMemoryStore sync.Map

func init() {
	go cleanupExpiredBuckets()
}

// cleanupExpiredBuckets periodically removes expired entries from the in-memory fallback store.
func cleanupExpiredBuckets() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()
	for range ticker.C {
		now := time.Now()
		inMemoryStore.Range(func(key, value any) bool {
			b := value.(*inMemoryBucket)
			b.mu.Lock()
			expired := now.After(b.expiry)
			b.mu.Unlock()
			if expired {
				inMemoryStore.Delete(key)
			}
			return true
		})
	}
}

// inMemoryIncr atomically increments the counter for key within window.
// Returns the new count. The window is only applied on the first increment or after expiry.
func inMemoryIncr(key string, window time.Duration) int64 {
	now := time.Now()
	actual, _ := inMemoryStore.LoadOrStore(key, &inMemoryBucket{expiry: now.Add(window)})
	b := actual.(*inMemoryBucket)
	b.mu.Lock()
	defer b.mu.Unlock()
	if now.After(b.expiry) {
		// Window has expired — reset the bucket
		b.count = 0
		b.expiry = now.Add(window)
	}
	b.count++
	return b.count
}

func RateLimiter(rdb *redis.Client, maxRequests int, disabled ...bool) fiber.Handler {
	if len(disabled) > 0 && disabled[0] {
		return func(c *fiber.Ctx) error { return c.Next() }
	}
	fallbackLimit := int64(maxRequests / 2) // stricter limit when using in-memory fallback
	if fallbackLimit < 1 {
		fallbackLimit = 1
	}
	return func(c *fiber.Ctx) error {
		ip := c.IP()
		key := fmt.Sprintf("rate_limit:%s", ip)
		ctx, cancel := context.WithTimeout(context.Background(), 500*time.Millisecond)
		defer cancel()
		window := time.Minute

		// Use pipeline: INCR + ExpireNX (only sets TTL on first request in window)
		pipe := rdb.Pipeline()
		incrCmd := pipe.Incr(ctx, key)
		pipe.ExpireNX(ctx, key, window)
		if _, err := pipe.Exec(ctx); err != nil {
			// Redis unavailable — use in-memory fallback with stricter limits
			slog.Warn("rate limiter: Redis unavailable, using in-memory fallback", "error", err, "ip", ip)
			count := inMemoryIncr(key, window)
			if count > fallbackLimit {
				return c.Status(429).JSON(fiber.Map{
					"success": false,
					"error": fiber.Map{
						"code":    "RATE_LIMIT_EXCEEDED",
						"message": "Terlalu banyak permintaan, coba lagi nanti",
					},
				})
			}
			return c.Next()
		}

		count := incrCmd.Val()

		if count > int64(maxRequests) {
			ttlCtx, ttlCancel := context.WithTimeout(context.Background(), 500*time.Millisecond)
			defer ttlCancel()
			ttl, _ := rdb.TTL(ttlCtx, key).Result()
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
func EndpointRateLimiter(rdb *redis.Client, keyPrefix string, maxAttempts int, window time.Duration, disabled ...bool) fiber.Handler {
	if len(disabled) > 0 && disabled[0] {
		return func(c *fiber.Ctx) error { return c.Next() }
	}
	fallbackLimit := int64(maxAttempts / 2)
	if fallbackLimit < 1 {
		fallbackLimit = 1
	}
	return func(c *fiber.Ctx) error {
		ip := c.IP()
		key := fmt.Sprintf("%s:%s", keyPrefix, ip)
		ctx, cancel := context.WithTimeout(context.Background(), 500*time.Millisecond)
		defer cancel()

		pipe := rdb.Pipeline()
		incrCmd := pipe.Incr(ctx, key)
		pipe.ExpireNX(ctx, key, window)
		if _, err := pipe.Exec(ctx); err != nil {
			// Redis unavailable — use in-memory fallback with stricter limits
			slog.Warn("endpoint rate limiter: Redis unavailable, using in-memory fallback", "error", err, "ip", ip, "endpoint", keyPrefix)
			count := inMemoryIncr(key, window)
			if count > fallbackLimit {
				return c.Status(429).JSON(fiber.Map{
					"success": false,
					"error": fiber.Map{
						"code":        "RATE_LIMIT_EXCEEDED",
						"message":     "Terlalu banyak permintaan, coba lagi nanti",
						"retry_after": int(window.Seconds()),
					},
				})
			}
			return c.Next()
		}

		count := incrCmd.Val()

		if count > int64(maxAttempts) {
			ttlCtx, ttlCancel := context.WithTimeout(context.Background(), 500*time.Millisecond)
			defer ttlCancel()
			ttl, _ := rdb.TTL(ttlCtx, key).Result()
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
func LoginRateLimiter(rdb *redis.Client, maxAttempts int, disabled ...bool) fiber.Handler {
	if len(disabled) > 0 && disabled[0] {
		return func(c *fiber.Ctx) error { return c.Next() }
	}
	fallbackLimit := int64(maxAttempts / 2)
	if fallbackLimit < 1 {
		fallbackLimit = 1
	}
	return func(c *fiber.Ctx) error {
		ip := c.IP()
		key := fmt.Sprintf("login_attempts:%s", ip)
		ctx, cancel := context.WithTimeout(context.Background(), 500*time.Millisecond)
		defer cancel()
		window := 10 * time.Minute

		// Use pipeline: INCR + ExpireNX (only sets TTL on first request in window)
		pipe := rdb.Pipeline()
		incrCmd := pipe.Incr(ctx, key)
		pipe.ExpireNX(ctx, key, window)
		if _, err := pipe.Exec(ctx); err != nil {
			// Redis unavailable — use in-memory fallback with stricter limits
			slog.Warn("login rate limiter: Redis unavailable, using in-memory fallback", "error", err, "ip", ip)
			count := inMemoryIncr(key, window)
			if count > fallbackLimit {
				return c.Status(429).JSON(fiber.Map{
					"success": false,
					"error": fiber.Map{
						"code":        "RATE_LIMIT_EXCEEDED",
						"message":     "Terlalu banyak percobaan login, coba lagi nanti",
						"retry_after": int(window.Seconds()),
					},
				})
			}
			return c.Next()
		}

		count := incrCmd.Val()

		if count > int64(maxAttempts) {
			ttlCtx, ttlCancel := context.WithTimeout(context.Background(), 500*time.Millisecond)
			defer ttlCancel()
			ttl, _ := rdb.TTL(ttlCtx, key).Result()
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
