package repository

import (
	"context"
	"errors"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"

	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/cache"
)

const (
	gameByIDKeyPrefix   = "game:"
	gameBySlugKeyPrefix = "game:slug:"
	gamesAllKey         = "games:all"

	gameTTL     = 10 * time.Minute
	gamesAllTTL = 5 * time.Minute
)

// CachedGameRepo wraps a GameRepository with Redis caching.
type CachedGameRepo struct {
	inner model.GameRepository
	cache *cache.Cache
}

// NewCachedGameRepo creates a cached wrapper around the given GameRepository.
func NewCachedGameRepo(inner model.GameRepository, c *cache.Cache) model.GameRepository {
	return &CachedGameRepo{inner: inner, cache: c}
}

func (r *CachedGameRepo) FindByID(ctx context.Context, id uuid.UUID) (*model.Game, error) {
	key := gameByIDKeyPrefix + id.String()

	var g model.Game
	if err := r.cache.Get(ctx, key, &g); err == nil {
		return &g, nil
	} else if !errors.Is(err, redis.Nil) {
		slog.Warn("cache get error", "key", key, "error", err)
	}

	result, err := r.inner.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if result == nil {
		return nil, nil
	}

	if cErr := r.cache.Set(ctx, key, result, gameTTL); cErr != nil {
		slog.Warn("cache set error", "key", key, "error", cErr)
	}
	return result, nil
}

func (r *CachedGameRepo) FindByIDs(ctx context.Context, ids []uuid.UUID) ([]*model.Game, error) {
	// Pass through to inner repo — batch lookups are not cached.
	return r.inner.FindByIDs(ctx, ids)
}

func (r *CachedGameRepo) FindBySlug(ctx context.Context, slug string) (*model.Game, error) {
	key := gameBySlugKeyPrefix + slug

	var g model.Game
	if err := r.cache.Get(ctx, key, &g); err == nil {
		return &g, nil
	} else if !errors.Is(err, redis.Nil) {
		slog.Warn("cache get error", "key", key, "error", err)
	}

	result, err := r.inner.FindBySlug(ctx, slug)
	if err != nil {
		return nil, err
	}
	if result == nil {
		return nil, nil
	}

	if cErr := r.cache.Set(ctx, key, result, gameTTL); cErr != nil {
		slog.Warn("cache set error", "key", key, "error", cErr)
	}
	return result, nil
}

func (r *CachedGameRepo) List(ctx context.Context) ([]*model.Game, error) {
	var games []*model.Game
	if err := r.cache.Get(ctx, gamesAllKey, &games); err == nil {
		return games, nil
	} else if !errors.Is(err, redis.Nil) {
		slog.Warn("cache get error", "key", gamesAllKey, "error", err)
	}

	games, err := r.inner.List(ctx)
	if err != nil {
		return nil, err
	}

	if cErr := r.cache.Set(ctx, gamesAllKey, games, gamesAllTTL); cErr != nil {
		slog.Warn("cache set error", "key", gamesAllKey, "error", cErr)
	}
	return games, nil
}

// InvalidateGame removes all cached entries for a specific game and the list cache.
func (r *CachedGameRepo) InvalidateGame(ctx context.Context, id uuid.UUID, slug string) {
	keys := []string{gamesAllKey, gameByIDKeyPrefix + id.String()}
	if slug != "" {
		keys = append(keys, gameBySlugKeyPrefix+slug)
	}
	if err := r.cache.Delete(ctx, keys...); err != nil {
		slog.Warn("cache invalidate game error", "id", id, "error", err)
	}
}

// InvalidateAll removes all game-related cache entries.
func (r *CachedGameRepo) InvalidateAll(ctx context.Context) {
	if err := r.cache.DeletePattern(ctx, "game:*"); err != nil {
		slog.Warn("cache invalidate all games error", "error", err)
	}
	if err := r.cache.Delete(ctx, gamesAllKey); err != nil {
		slog.Warn("cache invalidate games:all error", "error", err)
	}
}
