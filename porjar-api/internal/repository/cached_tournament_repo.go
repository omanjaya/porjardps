package repository

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"

	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/cache"
)

const (
	tournamentListKeyPrefix = "tournaments:list:"
	tournamentListTTL       = 2 * time.Minute
)

// cachedTournamentListResult is used for JSON serialization of the List result.
type cachedTournamentListResult struct {
	Tournaments []*model.Tournament `json:"tournaments"`
	Total       int                 `json:"total"`
}

// CachedTournamentRepo wraps a TournamentRepository with Redis caching for List.
type CachedTournamentRepo struct {
	inner model.TournamentRepository
	cache *cache.Cache
}

// NewCachedTournamentRepo creates a cached wrapper around the given TournamentRepository.
func NewCachedTournamentRepo(inner model.TournamentRepository, c *cache.Cache) model.TournamentRepository {
	return &CachedTournamentRepo{inner: inner, cache: c}
}

func (r *CachedTournamentRepo) FindByID(ctx context.Context, id uuid.UUID) (*model.Tournament, error) {
	return r.inner.FindByID(ctx, id)
}

func (r *CachedTournamentRepo) Create(ctx context.Context, t *model.Tournament) error {
	err := r.inner.Create(ctx, t)
	if err == nil {
		r.invalidateList(ctx)
	}
	return err
}

func (r *CachedTournamentRepo) Update(ctx context.Context, t *model.Tournament) error {
	err := r.inner.Update(ctx, t)
	if err == nil {
		r.invalidateList(ctx)
	}
	return err
}

func (r *CachedTournamentRepo) Delete(ctx context.Context, id uuid.UUID) error {
	err := r.inner.Delete(ctx, id)
	if err == nil {
		r.invalidateList(ctx)
	}
	return err
}

func (r *CachedTournamentRepo) UpdateStatus(ctx context.Context, id uuid.UUID, status string) error {
	err := r.inner.UpdateStatus(ctx, id, status)
	if err == nil {
		r.invalidateList(ctx)
	}
	return err
}

func (r *CachedTournamentRepo) List(ctx context.Context, filter model.TournamentFilter) ([]*model.Tournament, int, error) {
	key := r.listCacheKey(filter)

	var cached cachedTournamentListResult
	if err := r.cache.Get(ctx, key, &cached); err == nil {
		return cached.Tournaments, cached.Total, nil
	} else if !errors.Is(err, redis.Nil) {
		slog.Warn("cache get error", "key", key, "error", err)
	}

	tournaments, total, err := r.inner.List(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	cached = cachedTournamentListResult{Tournaments: tournaments, Total: total}
	if cErr := r.cache.Set(ctx, key, cached, tournamentListTTL); cErr != nil {
		slog.Warn("cache set error", "key", key, "error", cErr)
	}

	return tournaments, total, nil
}

func (r *CachedTournamentRepo) CountTeams(ctx context.Context, tournamentID uuid.UUID) (int, error) {
	return r.inner.CountTeams(ctx, tournamentID)
}

func (r *CachedTournamentRepo) CountTeamsBatch(ctx context.Context, tournamentIDs []uuid.UUID) (map[uuid.UUID]int, error) {
	return r.inner.CountTeamsBatch(ctx, tournamentIDs)
}

// listCacheKey builds a deterministic cache key from the filter parameters.
func (r *CachedTournamentRepo) listCacheKey(filter model.TournamentFilter) string {
	raw := fmt.Sprintf("gameID=%v|status=%v|page=%d|limit=%d",
		filter.GameID, filter.Status, filter.Page, filter.Limit)
	h := sha256.Sum256([]byte(raw))
	return tournamentListKeyPrefix + hex.EncodeToString(h[:8])
}

// invalidateList removes all tournament list cache entries.
func (r *CachedTournamentRepo) invalidateList(ctx context.Context) {
	if err := r.cache.DeletePattern(ctx, tournamentListKeyPrefix+"*"); err != nil {
		slog.Warn("cache invalidate tournament list error", "error", err)
	}
}
