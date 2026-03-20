package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/porjar-denpasar/porjar-api/internal/model"
)

type mediaRepo struct {
	db *pgxpool.Pool
}

func NewMediaRepo(db *pgxpool.Pool) model.MediaRepository {
	return &mediaRepo{db: db}
}

var mediaColumns = `id, uploaded_by, entity_type, entity_id, file_url, thumbnail_url, file_type, title, description, is_highlight, sort_order, created_at`

func scanMedia(row pgx.Row) (*model.Media, error) {
	m := &model.Media{}
	err := row.Scan(
		&m.ID, &m.UploadedBy, &m.EntityType, &m.EntityID,
		&m.FileURL, &m.ThumbnailURL, &m.FileType,
		&m.Title, &m.Description, &m.IsHighlight, &m.SortOrder, &m.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return m, nil
}

func scanMediaRows(rows pgx.Rows) ([]*model.Media, error) {
	var result []*model.Media
	for rows.Next() {
		m := &model.Media{}
		if err := rows.Scan(
			&m.ID, &m.UploadedBy, &m.EntityType, &m.EntityID,
			&m.FileURL, &m.ThumbnailURL, &m.FileType,
			&m.Title, &m.Description, &m.IsHighlight, &m.SortOrder, &m.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scanMediaRows: %w", err)
		}
		result = append(result, m)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("scanMediaRows rows: %w", err)
	}
	return result, nil
}

func (r *mediaRepo) Create(ctx context.Context, m *model.Media) (*model.Media, error) {
	row := r.db.QueryRow(ctx,
		`INSERT INTO media (uploaded_by, entity_type, entity_id, file_url, thumbnail_url, file_type, title, description, is_highlight, sort_order)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		 RETURNING `+mediaColumns,
		m.UploadedBy, m.EntityType, m.EntityID, m.FileURL, m.ThumbnailURL, m.FileType,
		m.Title, m.Description, m.IsHighlight, m.SortOrder,
	)
	result, err := scanMedia(row)
	if err != nil {
		return nil, fmt.Errorf("Create media: %w", err)
	}
	return result, nil
}

func (r *mediaRepo) FindByID(ctx context.Context, id uuid.UUID) (*model.Media, error) {
	row := r.db.QueryRow(ctx,
		`SELECT `+mediaColumns+` FROM media WHERE id = $1`, id)
	result, err := scanMedia(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("FindByID media: %w", err)
	}
	return result, nil
}

func (r *mediaRepo) FindByEntity(ctx context.Context, entityType string, entityID uuid.UUID) ([]*model.Media, error) {
	rows, err := r.db.Query(ctx,
		`SELECT `+mediaColumns+` FROM media WHERE entity_type = $1 AND entity_id = $2 ORDER BY sort_order ASC, created_at DESC`,
		entityType, entityID)
	if err != nil {
		return nil, fmt.Errorf("FindByEntity: %w", err)
	}
	defer rows.Close()
	return scanMediaRows(rows)
}

func (r *mediaRepo) FindHighlights(ctx context.Context, limit int) ([]*model.Media, error) {
	if limit <= 0 {
		limit = 20
	}
	rows, err := r.db.Query(ctx,
		`SELECT `+mediaColumns+` FROM media WHERE is_highlight = true ORDER BY created_at DESC LIMIT $1`,
		limit)
	if err != nil {
		return nil, fmt.Errorf("FindHighlights: %w", err)
	}
	defer rows.Close()
	return scanMediaRows(rows)
}

func (r *mediaRepo) Update(ctx context.Context, m *model.Media) (*model.Media, error) {
	row := r.db.QueryRow(ctx,
		`UPDATE media SET title = $2, description = $3, is_highlight = $4, sort_order = $5, thumbnail_url = $6
		 WHERE id = $1
		 RETURNING `+mediaColumns,
		m.ID, m.Title, m.Description, m.IsHighlight, m.SortOrder, m.ThumbnailURL,
	)
	result, err := scanMedia(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("Update media: %w", err)
	}
	return result, nil
}

func (r *mediaRepo) Delete(ctx context.Context, id uuid.UUID) error {
	tag, err := r.db.Exec(ctx, `DELETE FROM media WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("Delete media: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("media not found")
	}
	return nil
}
