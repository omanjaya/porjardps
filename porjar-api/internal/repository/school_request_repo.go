package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/porjar-denpasar/porjar-api/internal/model"
)

type schoolRequestRepo struct {
	db *pgxpool.Pool
}

func NewSchoolRequestRepo(db *pgxpool.Pool) model.SchoolRequestRepository {
	return &schoolRequestRepo{db: db}
}

func (r *schoolRequestRepo) Create(ctx context.Context, sr *model.SchoolRequest) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO school_requests (id, name, level, requested_by, status, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6)`,
		sr.ID, sr.Name, sr.Level, sr.RequestedBy, sr.Status, sr.CreatedAt)
	if err != nil {
		return fmt.Errorf("Create: %w", err)
	}
	return nil
}

func (r *schoolRequestRepo) FindByID(ctx context.Context, id uuid.UUID) (*model.SchoolRequest, error) {
	sr := &model.SchoolRequest{}
	err := r.db.QueryRow(ctx,
		`SELECT sr.id, sr.name, sr.level, sr.requested_by, sr.status, sr.reject_reason,
		        sr.school_id, sr.created_at, sr.reviewed_at, u.full_name
		 FROM school_requests sr
		 JOIN users u ON u.id = sr.requested_by
		 WHERE sr.id = $1`, id).
		Scan(&sr.ID, &sr.Name, &sr.Level, &sr.RequestedBy, &sr.Status, &sr.RejectReason,
			&sr.SchoolID, &sr.CreatedAt, &sr.ReviewedAt, &sr.RequesterName)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("FindByID: %w", err)
	}
	return sr, nil
}

func (r *schoolRequestRepo) FindPendingByUser(ctx context.Context, userID uuid.UUID) (*model.SchoolRequest, error) {
	sr := &model.SchoolRequest{}
	err := r.db.QueryRow(ctx,
		`SELECT id, name, level, requested_by, status, reject_reason, school_id, created_at, reviewed_at
		 FROM school_requests
		 WHERE requested_by = $1 AND status = 'pending'
		 LIMIT 1`, userID).
		Scan(&sr.ID, &sr.Name, &sr.Level, &sr.RequestedBy, &sr.Status, &sr.RejectReason,
			&sr.SchoolID, &sr.CreatedAt, &sr.ReviewedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("FindPendingByUser: %w", err)
	}
	return sr, nil
}

func (r *schoolRequestRepo) List(ctx context.Context, filter model.SchoolRequestFilter) ([]*model.SchoolRequest, int, error) {
	var (
		conditions []string
		args       []interface{}
		argIdx     int
	)

	if filter.Status != nil {
		argIdx++
		conditions = append(conditions, fmt.Sprintf("sr.status = $%d", argIdx))
		args = append(args, *filter.Status)
	}

	where := ""
	if len(conditions) > 0 {
		where = " WHERE " + strings.Join(conditions, " AND ")
	}

	var total int
	err := r.db.QueryRow(ctx, "SELECT COUNT(*) FROM school_requests sr"+where, args...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("List count: %w", err)
	}

	if filter.Page < 1 {
		filter.Page = 1
	}
	if filter.Limit < 1 {
		filter.Limit = 20
	}
	offset := (filter.Page - 1) * filter.Limit
	argIdx++
	limitClause := fmt.Sprintf(" ORDER BY sr.created_at DESC LIMIT $%d", argIdx)
	args = append(args, filter.Limit)
	argIdx++
	limitClause += fmt.Sprintf(" OFFSET $%d", argIdx)
	args = append(args, offset)

	query := `SELECT sr.id, sr.name, sr.level, sr.requested_by, sr.status, sr.reject_reason,
	                 sr.school_id, sr.created_at, sr.reviewed_at, u.full_name
	          FROM school_requests sr
	          JOIN users u ON u.id = sr.requested_by` + where + limitClause

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("List query: %w", err)
	}
	defer rows.Close()

	var requests []*model.SchoolRequest
	for rows.Next() {
		sr := &model.SchoolRequest{}
		if err := rows.Scan(&sr.ID, &sr.Name, &sr.Level, &sr.RequestedBy, &sr.Status, &sr.RejectReason,
			&sr.SchoolID, &sr.CreatedAt, &sr.ReviewedAt, &sr.RequesterName); err != nil {
			return nil, 0, fmt.Errorf("List scan: %w", err)
		}
		requests = append(requests, sr)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("List rows: %w", err)
	}

	return requests, total, nil
}

func (r *schoolRequestRepo) UpdateStatus(ctx context.Context, id uuid.UUID, status string, rejectReason *string, schoolID *uuid.UUID, reviewedAt time.Time) error {
	_, err := r.db.Exec(ctx,
		`UPDATE school_requests SET status = $2, reject_reason = $3, school_id = $4, reviewed_at = $5 WHERE id = $1`,
		id, status, rejectReason, schoolID, reviewedAt)
	if err != nil {
		return fmt.Errorf("UpdateStatus: %w", err)
	}
	return nil
}
