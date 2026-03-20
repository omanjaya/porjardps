package model

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type Media struct {
	ID           uuid.UUID  `json:"id"`
	UploadedBy   *uuid.UUID `json:"uploaded_by"`
	EntityType   string     `json:"entity_type"`
	EntityID     *uuid.UUID `json:"entity_id"`
	FileURL      string     `json:"file_url"`
	ThumbnailURL *string    `json:"thumbnail_url"`
	FileType     string     `json:"file_type"`
	Title        *string    `json:"title"`
	Description  *string    `json:"description"`
	IsHighlight  bool       `json:"is_highlight"`
	SortOrder    int        `json:"sort_order"`
	CreatedAt    time.Time  `json:"created_at"`
}

type MediaRepository interface {
	Create(ctx context.Context, m *Media) (*Media, error)
	FindByID(ctx context.Context, id uuid.UUID) (*Media, error)
	FindByEntity(ctx context.Context, entityType string, entityID uuid.UUID) ([]*Media, error)
	FindHighlights(ctx context.Context, limit int) ([]*Media, error)
	Update(ctx context.Context, m *Media) (*Media, error)
	Delete(ctx context.Context, id uuid.UUID) error
}
