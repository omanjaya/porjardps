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

type matchGameRepo struct {
	db *pgxpool.Pool
}

func NewMatchGameRepo(db *pgxpool.Pool) model.MatchGameRepository {
	return &matchGameRepo{db: db}
}

func (r *matchGameRepo) FindByID(ctx context.Context, id uuid.UUID) (*model.MatchGame, error) {
	g := &model.MatchGame{}
	err := r.db.QueryRow(ctx,
		`SELECT id, bracket_match_id, game_number, winner_id, score_a, score_b,
		        duration_minutes, mvp_user_id, map_name, hero_bans, notes
		 FROM match_games WHERE id = $1`, id).
		Scan(&g.ID, &g.BracketMatchID, &g.GameNumber, &g.WinnerID, &g.ScoreA, &g.ScoreB,
			&g.DurationMinutes, &g.MvpUserID, &g.MapName, &g.HeroBans, &g.Notes)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("FindByID: %w", err)
	}
	return g, nil
}

func (r *matchGameRepo) Create(ctx context.Context, g *model.MatchGame) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO match_games (id, bracket_match_id, game_number, winner_id, score_a, score_b,
		        duration_minutes, mvp_user_id, map_name, hero_bans, notes)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
		g.ID, g.BracketMatchID, g.GameNumber, g.WinnerID, g.ScoreA, g.ScoreB,
		g.DurationMinutes, g.MvpUserID, g.MapName, g.HeroBans, g.Notes)
	if err != nil {
		return fmt.Errorf("Create: %w", err)
	}
	return nil
}

func (r *matchGameRepo) Update(ctx context.Context, g *model.MatchGame) error {
	_, err := r.db.Exec(ctx,
		`UPDATE match_games
		 SET winner_id = $2, score_a = $3, score_b = $4,
		     duration_minutes = $5, mvp_user_id = $6, map_name = $7,
		     hero_bans = $8, notes = $9
		 WHERE id = $1`,
		g.ID, g.WinnerID, g.ScoreA, g.ScoreB,
		g.DurationMinutes, g.MvpUserID, g.MapName, g.HeroBans, g.Notes)
	if err != nil {
		return fmt.Errorf("Update: %w", err)
	}
	return nil
}

func (r *matchGameRepo) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.Exec(ctx, `DELETE FROM match_games WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("Delete: %w", err)
	}
	return nil
}

func (r *matchGameRepo) ListByMatch(ctx context.Context, bracketMatchID uuid.UUID) ([]*model.MatchGame, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, bracket_match_id, game_number, winner_id, score_a, score_b,
		        duration_minutes, mvp_user_id, map_name, hero_bans, notes
		 FROM match_games WHERE bracket_match_id = $1
		 ORDER BY game_number ASC`, bracketMatchID)
	if err != nil {
		return nil, fmt.Errorf("ListByMatch: %w", err)
	}
	defer rows.Close()

	var games []*model.MatchGame
	for rows.Next() {
		g := &model.MatchGame{}
		if err := rows.Scan(&g.ID, &g.BracketMatchID, &g.GameNumber, &g.WinnerID, &g.ScoreA, &g.ScoreB,
			&g.DurationMinutes, &g.MvpUserID, &g.MapName, &g.HeroBans, &g.Notes); err != nil {
			return nil, fmt.Errorf("ListByMatch scan: %w", err)
		}
		games = append(games, g)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("ListByMatch rows: %w", err)
	}
	return games, nil
}
