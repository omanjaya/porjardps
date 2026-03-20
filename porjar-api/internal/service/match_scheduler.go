package service

import (
	"context"
	"encoding/json"
	"log/slog"
	"math/rand"
	"time"

	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/ws"
)

// MatchScheduler auto-sets matches to "live" when their scheduled time arrives.
type MatchScheduler struct {
	bracketRepo model.BracketRepository
	brLobbyRepo model.BRLobbyRepository
	hub         *ws.Hub
	stopCh      chan struct{}
}

func NewMatchScheduler(
	bracketRepo model.BracketRepository,
	brLobbyRepo model.BRLobbyRepository,
	hub *ws.Hub,
) *MatchScheduler {
	return &MatchScheduler{
		bracketRepo: bracketRepo,
		brLobbyRepo: brLobbyRepo,
		hub:         hub,
		stopCh:      make(chan struct{}),
	}
}

// Start runs the scheduler in a background goroutine, checking every 30 seconds.
func (s *MatchScheduler) Start() {
	go func() {
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()

		slog.Info("Match scheduler started", "interval", "30s")

		// Run once immediately on start, with a small jitter (0-5s) to spread load
		// when multiple instances start simultaneously.
		jitter := time.Duration(rand.Intn(5000)) * time.Millisecond
		time.Sleep(jitter)
		s.tick()

		for {
			select {
			case <-ticker.C:
				s.tick()
			case <-s.stopCh:
				slog.Info("Match scheduler stopped")
				return
			}
		}
	}()
}

// Stop gracefully stops the scheduler.
func (s *MatchScheduler) Stop() {
	close(s.stopCh)
}

func (s *MatchScheduler) tick() {
	// Use a bounded context so a slow DB doesn't hold up the next tick cycle.
	ctx, cancel := context.WithTimeout(context.Background(), 25*time.Second)
	defer cancel()

	now := time.Now()

	// Auto-live bracket matches
	s.autoLiveBracketMatches(ctx, now)

	// Auto-live BR lobbies
	s.autoLiveBRLobbies(ctx, now)
}

func (s *MatchScheduler) autoLiveBracketMatches(ctx context.Context, now time.Time) {
	// ListScheduledBefore only returns matches with status="scheduled" and scheduled_at <= now,
	// keeping the result set small and the query targeted.
	matches, err := s.bracketRepo.ListScheduledBefore(ctx, now)
	if err != nil {
		slog.Error("scheduler: failed to list scheduled matches", "error", err)
		return
	}

	for _, m := range matches {
		if err := s.bracketRepo.UpdateStatus(ctx, m.ID, "live"); err != nil {
			slog.Error("scheduler: failed to auto-live match", "match_id", m.ID, "error", err)
			continue
		}
		slog.Info("scheduler: match auto-set to live", "match_id", m.ID, "scheduled_at", m.ScheduledAt)

		// Broadcast via WebSocket
		if s.hub != nil {
			msg, _ := json.Marshal(map[string]interface{}{
				"type": "match_status",
				"data": map[string]interface{}{
					"match_id": m.ID.String(),
					"status":   "live",
				},
			})
			s.hub.BroadcastToRoom("live-scores", msg)
		}
	}
}

func (s *MatchScheduler) autoLiveBRLobbies(ctx context.Context, now time.Time) {
	lobbies, err := s.brLobbyRepo.ListScheduledBefore(ctx, now)
	if err != nil {
		slog.Error("scheduler: failed to list scheduled lobbies", "error", err)
		return
	}

	for _, l := range lobbies {
		if err := s.brLobbyRepo.UpdateStatus(ctx, l.ID, "live"); err != nil {
			slog.Error("scheduler: failed to auto-live lobby", "lobby_id", l.ID, "error", err)
			continue
		}
		slog.Info("scheduler: lobby auto-set to live", "lobby_id", l.ID, "scheduled_at", l.ScheduledAt)
	}
}
