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

type schoolRepo struct {
	db *pgxpool.Pool
}

func NewSchoolRepo(db *pgxpool.Pool) model.SchoolRepository {
	return &schoolRepo{db: db}
}

func (r *schoolRepo) FindByID(ctx context.Context, id uuid.UUID) (*model.School, error) {
	s := &model.School{}
	err := r.db.QueryRow(ctx,
		`SELECT id, name, level, address, city, logo_url, coach_phone, created_at
		 FROM schools WHERE id = $1`, id).
		Scan(&s.ID, &s.Name, &s.Level, &s.Address, &s.City, &s.LogoURL, &s.CoachPhone, &s.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("FindByID: %w", err)
	}
	return s, nil
}

func (r *schoolRepo) FindByIDs(ctx context.Context, ids []uuid.UUID) ([]*model.School, error) {
	if len(ids) == 0 {
		return nil, nil
	}
	rows, err := r.db.Query(ctx,
		`SELECT id, name, level, address, city, logo_url, coach_phone, created_at
		 FROM schools WHERE id = ANY($1)`, ids)
	if err != nil {
		return nil, fmt.Errorf("FindByIDs: %w", err)
	}
	defer rows.Close()

	var schools []*model.School
	for rows.Next() {
		s := &model.School{}
		if err := rows.Scan(&s.ID, &s.Name, &s.Level, &s.Address, &s.City, &s.LogoURL, &s.CoachPhone, &s.CreatedAt); err != nil {
			return nil, fmt.Errorf("FindByIDs scan: %w", err)
		}
		schools = append(schools, s)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("FindByIDs rows: %w", err)
	}
	return schools, nil
}

func (r *schoolRepo) FindByNameAndLevel(ctx context.Context, name, level string) (*model.School, error) {
	s := &model.School{}
	err := r.db.QueryRow(ctx,
		`SELECT id, name, level, address, city, logo_url, coach_phone, created_at
		 FROM schools WHERE LOWER(name) = LOWER($1) AND level = $2`, name, level).
		Scan(&s.ID, &s.Name, &s.Level, &s.Address, &s.City, &s.LogoURL, &s.CoachPhone, &s.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("FindByNameAndLevel: %w", err)
	}
	return s, nil
}

func (r *schoolRepo) Create(ctx context.Context, s *model.School) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO schools (id, name, level, address, city, coach_phone, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		s.ID, s.Name, s.Level, s.Address, s.City, s.CoachPhone, s.CreatedAt)
	if err != nil {
		return fmt.Errorf("Create: %w", err)
	}
	return nil
}

func (r *schoolRepo) Update(ctx context.Context, s *model.School) error {
	_, err := r.db.Exec(ctx,
		`UPDATE schools SET name = $2, level = $3, address = $4, city = $5, logo_url = $6, coach_phone = $7
		 WHERE id = $1`,
		s.ID, s.Name, s.Level, s.Address, s.City, s.LogoURL, s.CoachPhone)
	if err != nil {
		return fmt.Errorf("Update: %w", err)
	}
	return nil
}

func (r *schoolRepo) List(ctx context.Context, filter model.SchoolFilter) ([]*model.School, int, error) {
	var (
		conditions []string
		args       []interface{}
		argIdx     int
	)

	if filter.Level != nil {
		argIdx++
		conditions = append(conditions, fmt.Sprintf("level = $%d", argIdx))
		args = append(args, *filter.Level)
	}
	if filter.Search != nil {
		argIdx++
		conditions = append(conditions, fmt.Sprintf("name ILIKE $%d", argIdx))
		args = append(args, "%"+*filter.Search+"%")
	}

	where := ""
	if len(conditions) > 0 {
		where = " WHERE " + strings.Join(conditions, " AND ")
	}

	var total int
	err := r.db.QueryRow(ctx, "SELECT COUNT(*) FROM schools"+where, args...).Scan(&total)
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
	limitClause := fmt.Sprintf(" ORDER BY name ASC LIMIT $%d", argIdx)
	args = append(args, filter.Limit)
	argIdx++
	limitClause += fmt.Sprintf(" OFFSET $%d", argIdx)
	args = append(args, offset)

	query := `SELECT id, name, level, address, city, logo_url, coach_phone, created_at FROM schools` + where + limitClause

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("List query: %w", err)
	}
	defer rows.Close()

	var schools []*model.School
	for rows.Next() {
		s := &model.School{}
		if err := rows.Scan(&s.ID, &s.Name, &s.Level, &s.Address, &s.City, &s.LogoURL, &s.CoachPhone, &s.CreatedAt); err != nil {
			return nil, 0, fmt.Errorf("List scan: %w", err)
		}
		schools = append(schools, s)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("List rows: %w", err)
	}

	return schools, total, nil
}

func (r *schoolRepo) HasTeams(ctx context.Context, id uuid.UUID) (bool, error) {
	var count int
	err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM teams WHERE school_id = $1`, id).Scan(&count)
	if err != nil {
		return false, fmt.Errorf("HasTeams: %w", err)
	}
	return count > 0, nil
}
