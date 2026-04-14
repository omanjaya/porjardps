// Package audit provides a fire-and-forget global helper for writing
// activity log entries from services/handlers without threading the
// ActivityLogRepository through every constructor.
//
// Usage:
//
//	audit.Init(activityLogRepo) // once at startup in routes.go
//	audit.Log(ctx, audit.Entry{Action: "team_created", ...})
//
// All writes are best-effort: failures are logged but never returned
// to the caller, so audit failures cannot break a mutation.
package audit

import (
	"context"
	"encoding/json"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
)

var repo model.ActivityLogRepository

// Init wires the global activity log repository. Safe to call once at
// application startup. If never called, Log becomes a no-op.
func Init(r model.ActivityLogRepository) {
	repo = r
}

// Entry is a simplified audit entry. Details is optional.
type Entry struct {
	UserID     *uuid.UUID
	Action     string
	EntityType string
	EntityID   *uuid.UUID
	Details    map[string]interface{}
	IPAddress  *string
}

// Log writes an activity log entry. Errors are only logged; the caller
// never needs to check the result. If the repo is not initialized (e.g.
// in unit tests), this is a no-op.
func Log(ctx context.Context, e Entry) {
	if repo == nil {
		return
	}

	var details json.RawMessage
	if e.Details != nil {
		if b, err := json.Marshal(e.Details); err == nil {
			details = b
		}
	}

	log := &model.ActivityLog{
		ID:         uuid.New(),
		UserID:     e.UserID,
		Action:     e.Action,
		EntityType: e.EntityType,
		EntityID:   e.EntityID,
		Details:    details,
		IPAddress:  e.IPAddress,
		CreatedAt:  time.Now(),
	}

	// Detach from request context so the write isn't cancelled when the
	// HTTP handler returns. 5s timeout is plenty for an INSERT.
	bgCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := repo.Create(bgCtx, log); err != nil {
		slog.Warn("audit log write failed",
			"action", e.Action,
			"entity_type", e.EntityType,
			"error", err)
	}
}

// UserIDPtr is a convenience for turning a uuid.UUID into *uuid.UUID.
func UserIDPtr(id uuid.UUID) *uuid.UUID {
	return &id
}
