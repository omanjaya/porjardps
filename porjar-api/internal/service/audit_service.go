package service

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
)

type AuditService struct {
	activityLogRepo model.ActivityLogRepository
}

func NewAuditService(activityLogRepo model.ActivityLogRepository) *AuditService {
	return &AuditService{activityLogRepo: activityLogRepo}
}

type AuditEntry struct {
	UserID     *uuid.UUID
	Action     string
	EntityType string
	EntityID   *uuid.UUID
	Details    map[string]interface{}
	IPAddress  *string
}

func (s *AuditService) Log(ctx context.Context, entry AuditEntry) error {
	var detailsJSON json.RawMessage
	if entry.Details != nil {
		b, err := json.Marshal(entry.Details)
		if err != nil {
			return apperror.Wrap(err, "marshal audit details")
		}
		detailsJSON = b
	}

	log := &model.ActivityLog{
		ID:         uuid.New(),
		UserID:     entry.UserID,
		Action:     entry.Action,
		EntityType: entry.EntityType,
		EntityID:   entry.EntityID,
		Details:    detailsJSON,
		IPAddress:  entry.IPAddress,
		CreatedAt:  time.Now(),
	}

	if err := s.activityLogRepo.Create(ctx, log); err != nil {
		return apperror.Wrap(err, "create audit log")
	}

	return nil
}
