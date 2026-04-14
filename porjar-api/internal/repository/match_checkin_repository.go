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

type MatchCheckinRepo struct {
	db *pgxpool.Pool
}

func NewMatchCheckinRepo(db *pgxpool.Pool) *MatchCheckinRepo {
	return &MatchCheckinRepo{db: db}
}

// Create inserts a new check-in. Returns the created row. If a conflicting
// row already exists (same match_id + match_type + team_side), returns the
// existing row unchanged.
func (r *MatchCheckinRepo) Create(ctx context.Context, ci *model.MatchCheckin) (*model.MatchCheckin, error) {
	row := &model.MatchCheckin{}
	err := r.db.QueryRow(ctx,
		`INSERT INTO match_checkins (match_id, match_type, team_id, team_side, checked_in_by)
		 VALUES ($1, $2, $3, $4, $5)
		 ON CONFLICT (match_id, team_side, match_type) DO NOTHING
		 RETURNING id, match_id, match_type, team_id, team_side, checked_in_by, checked_in_at`,
		ci.MatchID, ci.MatchType, ci.TeamID, ci.TeamSide, ci.CheckedInBy,
	).Scan(&row.ID, &row.MatchID, &row.MatchType, &row.TeamID, &row.TeamSide, &row.CheckedInBy, &row.CheckedInAt)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			// conflict — fetch existing
			existing, ferr := r.FindOne(ctx, ci.MatchID, ci.MatchType, ci.TeamSide)
			if ferr != nil {
				return nil, ferr
			}
			return existing, nil
		}
		return nil, fmt.Errorf("match_checkin create: %w", err)
	}
	return row, nil
}

func (r *MatchCheckinRepo) FindOne(ctx context.Context, matchID uuid.UUID, matchType, teamSide string) (*model.MatchCheckin, error) {
	row := &model.MatchCheckin{}
	err := r.db.QueryRow(ctx,
		`SELECT id, match_id, match_type, team_id, team_side, checked_in_by, checked_in_at
		 FROM match_checkins
		 WHERE match_id = $1 AND match_type = $2 AND team_side = $3`,
		matchID, matchType, teamSide,
	).Scan(&row.ID, &row.MatchID, &row.MatchType, &row.TeamID, &row.TeamSide, &row.CheckedInBy, &row.CheckedInAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("match_checkin find_one: %w", err)
	}
	return row, nil
}

func (r *MatchCheckinRepo) FindByMatch(ctx context.Context, matchID uuid.UUID, matchType string) ([]*model.MatchCheckin, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, match_id, match_type, team_id, team_side, checked_in_by, checked_in_at
		 FROM match_checkins
		 WHERE match_id = $1 AND match_type = $2
		 ORDER BY checked_in_at ASC`,
		matchID, matchType,
	)
	if err != nil {
		return nil, fmt.Errorf("match_checkin find_by_match: %w", err)
	}
	defer rows.Close()

	var result []*model.MatchCheckin
	for rows.Next() {
		ci := &model.MatchCheckin{}
		if err := rows.Scan(&ci.ID, &ci.MatchID, &ci.MatchType, &ci.TeamID, &ci.TeamSide, &ci.CheckedInBy, &ci.CheckedInAt); err != nil {
			return nil, fmt.Errorf("match_checkin scan: %w", err)
		}
		result = append(result, ci)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("match_checkin rows: %w", err)
	}
	return result, nil
}

func (r *MatchCheckinRepo) Exists(ctx context.Context, matchID uuid.UUID, matchType, teamSide string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM match_checkins WHERE match_id = $1 AND match_type = $2 AND team_side = $3)`,
		matchID, matchType, teamSide,
	).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("match_checkin exists: %w", err)
	}
	return exists, nil
}
