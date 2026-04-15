package service

import (
	"context"
	"encoding/json"
	"log/slog"
	"math/rand"
	"time"

	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/ws"
)

// EventScheduler auto-transitions event and tournament statuses based on their
// configured start_date and end_date fields. It runs every 60 seconds.
//
// Transitions:
//   Event:      published    → ongoing   when start_date        <= now
//   Event:      ongoing      → completed when end_date          <= now (cascades child tournaments)
//   Tournament: registration → ongoing   when registration_end  <= now
//   Tournament: ongoing      → completed when end_date          <= now
type EventScheduler struct {
	eventRepo      model.EventRepository
	tournamentRepo model.TournamentRepository
	hub            *ws.Hub
	stopCh         chan struct{}
}

func NewEventScheduler(
	eventRepo model.EventRepository,
	tournamentRepo model.TournamentRepository,
	hub *ws.Hub,
) *EventScheduler {
	return &EventScheduler{
		eventRepo:      eventRepo,
		tournamentRepo: tournamentRepo,
		hub:            hub,
		stopCh:         make(chan struct{}),
	}
}

// Start runs the scheduler in a background goroutine, checking every 60 seconds.
func (s *EventScheduler) Start(ctx context.Context) {
	go func() {
		ticker := time.NewTicker(60 * time.Second)
		defer ticker.Stop()

		slog.Info("Event scheduler started", "interval", "60s")

		// Small startup jitter to spread load when multiple instances start simultaneously.
		time.Sleep(time.Duration(rand.Intn(5000)) * time.Millisecond)
		s.tick(ctx)

		for {
			select {
			case <-ticker.C:
				s.tick(ctx)
			case <-ctx.Done():
				slog.Info("Event scheduler stopped")
				return
			case <-s.stopCh:
				slog.Info("Event scheduler stopped")
				return
			}
		}
	}()
}

// Stop gracefully stops the scheduler.
func (s *EventScheduler) Stop() {
	close(s.stopCh)
}

func (s *EventScheduler) tick(parentCtx context.Context) {
	ctx, cancel := context.WithTimeout(parentCtx, 55*time.Second)
	defer cancel()

	now := time.Now()
	s.autoTransitionEvents(ctx, now)
	s.autoTransitionTournaments(ctx, now)
}

func (s *EventScheduler) autoTransitionEvents(ctx context.Context, now time.Time) {
	events, err := s.eventRepo.ListDueForTransition(ctx, now)
	if err != nil {
		slog.Error("event scheduler: failed to list events due for transition", "error", err)
		return
	}

	for _, e := range events {
		var newStatus string
		switch e.Status {
		case "published":
			newStatus = "ongoing"
		case "ongoing":
			newStatus = "completed"
		default:
			continue
		}

		if err := s.eventRepo.UpdateStatus(ctx, e.ID, newStatus); err != nil {
			slog.Error("event scheduler: failed to update event status",
				"event_id", e.ID, "from", e.Status, "to", newStatus, "error", err)
			continue
		}
		slog.Info("event scheduler: event auto-transitioned",
			"event_id", e.ID, "event_name", e.Name, "from", e.Status, "to", newStatus)

		// Cascade: when an event completes, complete all its non-finished child tournaments.
		if newStatus == "completed" {
			s.cascadeCompleteTournaments(ctx, e.ID, e.Name)
		}

		s.broadcastToRoom("live-scores", map[string]interface{}{
			"type": "tournament_update",
			"data": map[string]interface{}{"event_id": e.ID.String(), "status": newStatus},
		})
	}
}

// cascadeCompleteTournaments marks all non-terminal child tournaments of an event as completed.
func (s *EventScheduler) cascadeCompleteTournaments(ctx context.Context, eventID uuid.UUID, eventName string) {
	terminalStatuses := map[string]bool{"completed": true, "cancelled": true}
	limit := 500
	filter := model.TournamentFilter{EventID: &eventID, Page: 1, Limit: limit}

	tournaments, _, err := s.tournamentRepo.List(ctx, filter)
	if err != nil {
		slog.Error("event scheduler: cascade failed to list tournaments",
			"event_id", eventID, "error", err)
		return
	}

	for _, t := range tournaments {
		if terminalStatuses[t.Status] {
			continue
		}
		if err := s.tournamentRepo.UpdateStatus(ctx, t.ID, "completed"); err != nil {
			slog.Error("event scheduler: cascade failed to complete tournament",
				"tournament_id", t.ID, "error", err)
			continue
		}
		slog.Info("event scheduler: tournament cascade-completed",
			"tournament_id", t.ID, "tournament_name", t.Name, "event_name", eventName)

		s.broadcastToRoom("tournament:"+t.ID.String(), map[string]interface{}{
			"type": "tournament_update",
			"data": map[string]interface{}{"tournament_id": t.ID.String(), "status": "completed"},
		})
	}
}

func (s *EventScheduler) autoTransitionTournaments(ctx context.Context, now time.Time) {
	tournaments, err := s.tournamentRepo.ListDueForTransition(ctx, now)
	if err != nil {
		slog.Error("event scheduler: failed to list tournaments due for transition", "error", err)
		return
	}

	for _, t := range tournaments {
		var newStatus string
		switch t.Status {
		case "registration":
			newStatus = "ongoing"
		case "ongoing":
			newStatus = "completed"
		default:
			continue
		}

		if err := s.tournamentRepo.UpdateStatus(ctx, t.ID, newStatus); err != nil {
			slog.Error("event scheduler: failed to update tournament status",
				"tournament_id", t.ID, "from", t.Status, "to", newStatus, "error", err)
			continue
		}
		slog.Info("event scheduler: tournament auto-transitioned",
			"tournament_id", t.ID, "tournament_name", t.Name, "from", t.Status, "to", newStatus)

		s.broadcastToRoom("tournament:"+t.ID.String(), map[string]interface{}{
			"type": "tournament_update",
			"data": map[string]interface{}{"tournament_id": t.ID.String(), "status": newStatus},
		})
		s.broadcastToRoom("live-scores", map[string]interface{}{
			"type": "tournament_update",
			"data": map[string]interface{}{"tournament_id": t.ID.String(), "status": newStatus},
		})
	}
}

func (s *EventScheduler) broadcastToRoom(room string, payload map[string]interface{}) {
	if s.hub == nil {
		return
	}
	msg, err := json.Marshal(payload)
	if err != nil {
		return
	}
	s.hub.BroadcastToRoom(room, msg)
}
