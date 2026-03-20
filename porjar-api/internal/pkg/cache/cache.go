package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/redis/go-redis/v9"
)

// Cache wraps a Redis client with JSON marshal/unmarshal helpers.
type Cache struct {
	client *redis.Client
}

// New creates a new Cache instance.
func New(client *redis.Client) *Cache {
	return &Cache{client: client}
}

// Get retrieves a key from Redis and JSON-unmarshals it into dest.
// Returns redis.Nil if the key does not exist.
func (c *Cache) Get(ctx context.Context, key string, dest interface{}) error {
	data, err := c.client.Get(ctx, key).Bytes()
	if err != nil {
		return err
	}
	return json.Unmarshal(data, dest)
}

// Set JSON-marshals val and stores it in Redis with the given TTL.
func (c *Cache) Set(ctx context.Context, key string, val interface{}, ttl time.Duration) error {
	data, err := json.Marshal(val)
	if err != nil {
		return fmt.Errorf("cache set marshal: %w", err)
	}
	return c.client.Set(ctx, key, data, ttl).Err()
}

// Delete removes one or more keys from Redis.
func (c *Cache) Delete(ctx context.Context, keys ...string) error {
	if len(keys) == 0 {
		return nil
	}
	return c.client.Del(ctx, keys...).Err()
}

// DeletePattern removes all keys matching the given glob pattern using SCAN + DEL.
// This is safe for production use (no KEYS command).
func (c *Cache) DeletePattern(ctx context.Context, pattern string) error {
	var cursor uint64
	for {
		keys, nextCursor, err := c.client.Scan(ctx, cursor, pattern, 100).Result()
		if err != nil {
			return fmt.Errorf("cache delete pattern scan: %w", err)
		}
		if len(keys) > 0 {
			if err := c.client.Del(ctx, keys...).Err(); err != nil {
				slog.Warn("cache delete pattern del failed", "pattern", pattern, "error", err)
			}
		}
		cursor = nextCursor
		if cursor == 0 {
			break
		}
	}
	return nil
}
