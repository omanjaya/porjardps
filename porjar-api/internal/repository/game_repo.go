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

type gameRepo struct {
	db *pgxpool.Pool
}

func NewGameRepo(db *pgxpool.Pool) model.GameRepository {
	return &gameRepo{db: db}
}

func (r *gameRepo) FindByID(ctx context.Context, id uuid.UUID) (*model.Game, error) {
	g := &model.Game{}
	err := r.db.QueryRow(ctx,
		`SELECT id, name, slug, max_team_members, min_team_members, max_substitutes, game_type, icon_url, rules_url, is_active, created_at
		 FROM games WHERE id = $1`, id).
		Scan(&g.ID, &g.Name, &g.Slug, &g.MaxTeamMembers, &g.MinTeamMembers, &g.MaxSubstitutes, &g.GameType, &g.IconURL, &g.RulesURL, &g.IsActive, &g.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("FindByID: %w", err)
	}
	return g, nil
}

func (r *gameRepo) FindByIDs(ctx context.Context, ids []uuid.UUID) ([]*model.Game, error) {
	if len(ids) == 0 {
		return nil, nil
	}
	rows, err := r.db.Query(ctx,
		`SELECT id, name, slug, max_team_members, min_team_members, max_substitutes, game_type, icon_url, rules_url, is_active, created_at
		 FROM games WHERE id = ANY($1)`, ids)
	if err != nil {
		return nil, fmt.Errorf("FindByIDs: %w", err)
	}
	defer rows.Close()

	var games []*model.Game
	for rows.Next() {
		g := &model.Game{}
		if err := rows.Scan(&g.ID, &g.Name, &g.Slug, &g.MaxTeamMembers, &g.MinTeamMembers, &g.MaxSubstitutes, &g.GameType, &g.IconURL, &g.RulesURL, &g.IsActive, &g.CreatedAt); err != nil {
			return nil, fmt.Errorf("FindByIDs scan: %w", err)
		}
		games = append(games, g)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("FindByIDs rows: %w", err)
	}
	return games, nil
}

func (r *gameRepo) FindBySlug(ctx context.Context, slug string) (*model.Game, error) {
	g := &model.Game{}
	err := r.db.QueryRow(ctx,
		`SELECT id, name, slug, max_team_members, min_team_members, max_substitutes, game_type, icon_url, rules_url, is_active, created_at
		 FROM games WHERE slug = $1`, slug).
		Scan(&g.ID, &g.Name, &g.Slug, &g.MaxTeamMembers, &g.MinTeamMembers, &g.MaxSubstitutes, &g.GameType, &g.IconURL, &g.RulesURL, &g.IsActive, &g.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("FindBySlug: %w", err)
	}
	return g, nil
}

func (r *gameRepo) List(ctx context.Context) ([]*model.Game, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, name, slug, max_team_members, min_team_members, max_substitutes, game_type, icon_url, rules_url, is_active, created_at
		 FROM games ORDER BY name ASC`)
	if err != nil {
		return nil, fmt.Errorf("List: %w", err)
	}
	defer rows.Close()

	var games []*model.Game
	for rows.Next() {
		g := &model.Game{}
		if err := rows.Scan(&g.ID, &g.Name, &g.Slug, &g.MaxTeamMembers, &g.MinTeamMembers, &g.MaxSubstitutes, &g.GameType, &g.IconURL, &g.RulesURL, &g.IsActive, &g.CreatedAt); err != nil {
			return nil, fmt.Errorf("List scan: %w", err)
		}
		games = append(games, g)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("List rows: %w", err)
	}

	return games, nil
}
