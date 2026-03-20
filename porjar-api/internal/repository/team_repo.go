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

type teamRepo struct {
	db *pgxpool.Pool
}

func NewTeamRepo(db *pgxpool.Pool) model.TeamRepository {
	return &teamRepo{db: db}
}

func (r *teamRepo) FindByID(ctx context.Context, id uuid.UUID) (*model.Team, error) {
	t := &model.Team{}
	err := r.db.QueryRow(ctx,
		`SELECT id, name, school_id, game_id, captain_user_id, logo_url, status, seed, created_at, updated_at
		 FROM teams WHERE id = $1`, id).
		Scan(&t.ID, &t.Name, &t.SchoolID, &t.GameID, &t.CaptainUserID, &t.LogoURL, &t.Status, &t.Seed, &t.CreatedAt, &t.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("FindByID: %w", err)
	}
	return t, nil
}

func (r *teamRepo) FindByIDs(ctx context.Context, ids []uuid.UUID) ([]*model.Team, error) {
	if len(ids) == 0 {
		return nil, nil
	}
	rows, err := r.db.Query(ctx,
		`SELECT t.id, t.name, t.school_id, t.game_id, t.captain_user_id, t.logo_url, t.status, t.seed, t.created_at, t.updated_at,
		        s.logo_url AS school_logo_url
		 FROM teams t
		 LEFT JOIN schools s ON s.id = t.school_id
		 WHERE t.id = ANY($1)`, ids)
	if err != nil {
		return nil, fmt.Errorf("FindByIDs: %w", err)
	}
	defer rows.Close()

	var teams []*model.Team
	for rows.Next() {
		t := &model.Team{}
		if err := rows.Scan(&t.ID, &t.Name, &t.SchoolID, &t.GameID, &t.CaptainUserID, &t.LogoURL, &t.Status, &t.Seed, &t.CreatedAt, &t.UpdatedAt, &t.SchoolLogoURL); err != nil {
			return nil, fmt.Errorf("FindByIDs scan: %w", err)
		}
		teams = append(teams, t)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("FindByIDs rows: %w", err)
	}
	return teams, nil
}

func (r *teamRepo) FindByNameAndGame(ctx context.Context, name string, gameID uuid.UUID) (*model.Team, error) {
	t := &model.Team{}
	err := r.db.QueryRow(ctx,
		`SELECT id, name, school_id, game_id, captain_user_id, logo_url, status, seed, created_at, updated_at
		 FROM teams WHERE LOWER(name) = LOWER($1) AND game_id = $2`, name, gameID).
		Scan(&t.ID, &t.Name, &t.SchoolID, &t.GameID, &t.CaptainUserID, &t.LogoURL, &t.Status, &t.Seed, &t.CreatedAt, &t.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("FindByNameAndGame: %w", err)
	}
	return t, nil
}

func (r *teamRepo) Create(ctx context.Context, t *model.Team) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO teams (id, name, school_id, game_id, captain_user_id, logo_url, status, seed, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
		t.ID, t.Name, t.SchoolID, t.GameID, t.CaptainUserID, t.LogoURL, t.Status, t.Seed, t.CreatedAt, t.UpdatedAt)
	if err != nil {
		return fmt.Errorf("Create: %w", err)
	}
	return nil
}

func (r *teamRepo) CreateTx(ctx context.Context, tx pgx.Tx, t *model.Team) error {
	_, err := tx.Exec(ctx,
		`INSERT INTO teams (id, name, school_id, game_id, captain_user_id, logo_url, status, seed, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
		t.ID, t.Name, t.SchoolID, t.GameID, t.CaptainUserID, t.LogoURL, t.Status, t.Seed, t.CreatedAt, t.UpdatedAt)
	if err != nil {
		return fmt.Errorf("CreateTx: %w", err)
	}
	return nil
}

func (r *teamRepo) Update(ctx context.Context, t *model.Team) error {
	_, err := r.db.Exec(ctx,
		`UPDATE teams SET name = $2, school_id = $3, captain_user_id = $4, logo_url = $5, seed = $6, updated_at = $7
		 WHERE id = $1`,
		t.ID, t.Name, t.SchoolID, t.CaptainUserID, t.LogoURL, t.Seed, t.UpdatedAt)
	if err != nil {
		return fmt.Errorf("Update: %w", err)
	}
	return nil
}

func (r *teamRepo) UpdateStatus(ctx context.Context, id uuid.UUID, status string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE teams SET status = $2, updated_at = NOW() WHERE id = $1`, id, status)
	if err != nil {
		return fmt.Errorf("UpdateStatus: %w", err)
	}
	return nil
}

func (r *teamRepo) List(ctx context.Context, filter model.TeamFilter) ([]*model.Team, int, error) {
	var (
		conditions []string
		args       []interface{}
		argIdx     int
	)

	if filter.GameID != nil {
		argIdx++
		conditions = append(conditions, fmt.Sprintf("game_id = $%d", argIdx))
		args = append(args, *filter.GameID)
	}
	if filter.SchoolID != nil {
		argIdx++
		conditions = append(conditions, fmt.Sprintf("school_id = $%d", argIdx))
		args = append(args, *filter.SchoolID)
	}
	if filter.Status != nil {
		argIdx++
		conditions = append(conditions, fmt.Sprintf("status = $%d", argIdx))
		args = append(args, *filter.Status)
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

	if filter.Page < 1 {
		filter.Page = 1
	}
	if filter.Limit < 1 {
		filter.Limit = 20
	}
	offset := (filter.Page - 1) * filter.Limit
	argIdx++
	limitArg := argIdx
	args = append(args, filter.Limit)
	argIdx++
	offsetArg := argIdx
	args = append(args, offset)

	query := fmt.Sprintf(
		`SELECT id, name, school_id, game_id, captain_user_id, logo_url, status, seed, created_at, updated_at,
		        COUNT(*) OVER() AS total_count
		 FROM teams%s
		 ORDER BY created_at DESC LIMIT $%d OFFSET $%d`,
		where, limitArg, offsetArg,
	)

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("List query: %w", err)
	}
	defer rows.Close()

	var teams []*model.Team
	var total int
	for rows.Next() {
		t := &model.Team{}
		if err := rows.Scan(&t.ID, &t.Name, &t.SchoolID, &t.GameID, &t.CaptainUserID, &t.LogoURL, &t.Status, &t.Seed, &t.CreatedAt, &t.UpdatedAt, &total); err != nil {
			return nil, 0, fmt.Errorf("List scan: %w", err)
		}
		teams = append(teams, t)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("List rows: %w", err)
	}

	return teams, total, nil
}

func (r *teamRepo) FindByUserAndGame(ctx context.Context, userID, gameID uuid.UUID) (*model.Team, error) {
	t := &model.Team{}
	err := r.db.QueryRow(ctx,
		`SELECT t.id, t.name, t.school_id, t.game_id, t.captain_user_id, t.logo_url, t.status, t.seed, t.created_at, t.updated_at
		 FROM teams t
		 JOIN team_members tm ON tm.team_id = t.id
		 WHERE tm.user_id = $1 AND t.game_id = $2
		 LIMIT 1`, userID, gameID).
		Scan(&t.ID, &t.Name, &t.SchoolID, &t.GameID, &t.CaptainUserID, &t.LogoURL, &t.Status, &t.Seed, &t.CreatedAt, &t.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("FindByUserAndGame: %w", err)
	}
	return t, nil
}

func (r *teamRepo) CountByGame(ctx context.Context, gameID uuid.UUID) (int, error) {
	var count int
	err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM teams WHERE game_id = $1`, gameID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("CountByGame: %w", err)
	}
	return count, nil
}

func (r *teamRepo) CountActiveTournaments(ctx context.Context, id uuid.UUID) (int, error) {
	var count int
	err := r.db.QueryRow(ctx, `
		SELECT COUNT(*) FROM tournament_teams tt
		JOIN tournaments t ON t.id = tt.tournament_id
		WHERE tt.team_id = $1 AND t.status NOT IN ('completed','cancelled')
	`, id).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("CountActiveTournaments: %w", err)
	}
	return count, nil
}

func (r *teamRepo) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.Exec(ctx, `DELETE FROM teams WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("Delete team: %w", err)
	}
	return nil
}
