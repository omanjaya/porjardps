package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/porjar-denpasar/porjar-api/internal/model"
)

type activityLogRepo struct {
	db *pgxpool.Pool
}

func NewActivityLogRepo(db *pgxpool.Pool) model.ActivityLogRepository {
	return &activityLogRepo{db: db}
}

func (r *activityLogRepo) Create(ctx context.Context, log *model.ActivityLog) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO activity_logs (id, user_id, action, entity_type, entity_id, details, ip_address, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
		log.ID, log.UserID, log.Action, log.EntityType, log.EntityID, log.Details, log.IPAddress, log.CreatedAt)
	if err != nil {
		return fmt.Errorf("Create: %w", err)
	}
	return nil
}

func (r *activityLogRepo) FindByID(ctx context.Context, id uuid.UUID) (*model.ActivityLog, error) {
	l := &model.ActivityLog{}
	err := r.db.QueryRow(ctx,
		`SELECT id, user_id, action, entity_type, entity_id, details, ip_address, created_at
		 FROM activity_logs WHERE id = $1`, id).
		Scan(&l.ID, &l.UserID, &l.Action, &l.EntityType, &l.EntityID, &l.Details, &l.IPAddress, &l.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("FindByID: %w", err)
	}
	return l, nil
}

func (r *activityLogRepo) List(ctx context.Context, filter model.ActivityLogFilter) ([]*model.ActivityLog, int, error) {
	var (
		conditions []string
		args       []interface{}
		argIdx     int
	)

	if filter.UserID != nil {
		argIdx++
		conditions = append(conditions, fmt.Sprintf("user_id = $%d", argIdx))
		args = append(args, *filter.UserID)
	}
	if filter.Action != nil {
		argIdx++
		conditions = append(conditions, fmt.Sprintf("action = $%d", argIdx))
		args = append(args, *filter.Action)
	}
	if filter.EntityType != nil {
		argIdx++
		conditions = append(conditions, fmt.Sprintf("entity_type = $%d", argIdx))
		args = append(args, *filter.EntityType)
	}
	if filter.EntityID != nil {
		argIdx++
		conditions = append(conditions, fmt.Sprintf("entity_id = $%d", argIdx))
		args = append(args, *filter.EntityID)
	}

	where := ""
	if len(conditions) > 0 {
		where = " WHERE " + strings.Join(conditions, " AND ")
	}

	var total int
	err := r.db.QueryRow(ctx, "SELECT COUNT(*) FROM activity_logs"+where, args...).Scan(&total)
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
	limitClause := fmt.Sprintf(" ORDER BY created_at DESC LIMIT $%d", argIdx)
	args = append(args, filter.Limit)
	argIdx++
	limitClause += fmt.Sprintf(" OFFSET $%d", argIdx)
	args = append(args, offset)

	query := `SELECT id, user_id, action, entity_type, entity_id, details, ip_address, created_at
		FROM activity_logs` + where + limitClause

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("List query: %w", err)
	}
	defer rows.Close()

	var logs []*model.ActivityLog
	for rows.Next() {
		l := &model.ActivityLog{}
		if err := rows.Scan(&l.ID, &l.UserID, &l.Action, &l.EntityType, &l.EntityID, &l.Details, &l.IPAddress, &l.CreatedAt); err != nil {
			return nil, 0, fmt.Errorf("List scan: %w", err)
		}
		logs = append(logs, l)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("List rows: %w", err)
	}

	return logs, total, nil
}

func (r *activityLogRepo) ListByUser(ctx context.Context, userID uuid.UUID, page, limit int) ([]*model.ActivityLog, int, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 20
	}

	var total int
	err := r.db.QueryRow(ctx, "SELECT COUNT(*) FROM activity_logs WHERE user_id = $1", userID).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("ListByUser count: %w", err)
	}

	offset := (page - 1) * limit
	rows, err := r.db.Query(ctx,
		`SELECT id, user_id, action, entity_type, entity_id, details, ip_address, created_at
		 FROM activity_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
		userID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("ListByUser query: %w", err)
	}
	defer rows.Close()

	var logs []*model.ActivityLog
	for rows.Next() {
		l := &model.ActivityLog{}
		if err := rows.Scan(&l.ID, &l.UserID, &l.Action, &l.EntityType, &l.EntityID, &l.Details, &l.IPAddress, &l.CreatedAt); err != nil {
			return nil, 0, fmt.Errorf("ListByUser scan: %w", err)
		}
		logs = append(logs, l)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("ListByUser rows: %w", err)
	}

	return logs, total, nil
}

func (r *activityLogRepo) ListByEntity(ctx context.Context, entityType string, entityID uuid.UUID) ([]*model.ActivityLog, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, user_id, action, entity_type, entity_id, details, ip_address, created_at
		 FROM activity_logs WHERE entity_type = $1 AND entity_id = $2 ORDER BY created_at DESC`,
		entityType, entityID)
	if err != nil {
		return nil, fmt.Errorf("ListByEntity: %w", err)
	}
	defer rows.Close()

	var logs []*model.ActivityLog
	for rows.Next() {
		l := &model.ActivityLog{}
		if err := rows.Scan(&l.ID, &l.UserID, &l.Action, &l.EntityType, &l.EntityID, &l.Details, &l.IPAddress, &l.CreatedAt); err != nil {
			return nil, fmt.Errorf("ListByEntity scan: %w", err)
		}
		logs = append(logs, l)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("ListByEntity rows: %w", err)
	}

	return logs, nil
}

func (r *activityLogRepo) FindRecent(ctx context.Context, limit int) ([]*model.ActivityLog, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, user_id, action, entity_type, entity_id, details, ip_address, created_at
		 FROM activity_logs ORDER BY created_at DESC LIMIT $1`, limit)
	if err != nil {
		return nil, fmt.Errorf("FindRecent: %w", err)
	}
	defer rows.Close()

	var logs []*model.ActivityLog
	for rows.Next() {
		l := &model.ActivityLog{}
		if err := rows.Scan(&l.ID, &l.UserID, &l.Action, &l.EntityType, &l.EntityID, &l.Details, &l.IPAddress, &l.CreatedAt); err != nil {
			return nil, fmt.Errorf("FindRecent scan: %w", err)
		}
		logs = append(logs, l)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("FindRecent rows: %w", err)
	}

	return logs, nil
}
