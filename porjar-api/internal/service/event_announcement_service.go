package service

import (
	"context"
	"errors"
	"strings"

	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/audit"
	"github.com/porjar-denpasar/porjar-api/internal/repository"
)

type EventAnnouncementService struct {
	repo *repository.EventAnnouncementRepository
}

func NewEventAnnouncementService(repo *repository.EventAnnouncementRepository) *EventAnnouncementService {
	return &EventAnnouncementService{repo: repo}
}

type CreateAnnouncementInput struct {
	EventID   uuid.UUID
	Title     string
	Message   string
	Priority  string
	CreatedBy *uuid.UUID
}

func (s *EventAnnouncementService) List(ctx context.Context, eventID uuid.UUID) ([]*model.EventAnnouncement, error) {
	return s.repo.ListByEvent(ctx, eventID, true)
}

func (s *EventAnnouncementService) ListActive(ctx context.Context) ([]*model.EventAnnouncement, error) {
	return s.repo.ListActiveAll(ctx)
}

func (s *EventAnnouncementService) Create(ctx context.Context, in CreateAnnouncementInput) (*model.EventAnnouncement, error) {
	title := strings.TrimSpace(in.Title)
	msg := strings.TrimSpace(in.Message)
	if title == "" || msg == "" {
		return nil, errors.New("title and message are required")
	}
	priority := in.Priority
	switch priority {
	case "low", "normal", "high", "urgent":
	case "":
		priority = "normal"
	default:
		return nil, errors.New("invalid priority")
	}
	a := &model.EventAnnouncement{
		EventID:   in.EventID,
		Title:     title,
		Message:   msg,
		Priority:  priority,
		CreatedBy: in.CreatedBy,
	}
	if err := s.repo.Create(ctx, a); err != nil {
		return nil, err
	}

	eventID := in.EventID
	audit.Log(ctx, audit.Entry{
		UserID:     in.CreatedBy,
		Action:     "event_announcement_created",
		EntityType: "event_announcement",
		EntityID:   &eventID,
		Details: map[string]interface{}{
			"announcement_id": a.ID,
			"title":           title,
			"priority":        priority,
		},
	})

	return a, nil
}

func (s *EventAnnouncementService) Delete(ctx context.Context, id int64) error {
	return s.repo.Delete(ctx, id)
}
