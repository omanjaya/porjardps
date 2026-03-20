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

// --- BRLobbyResultRepository ---

type brLobbyResultRepo struct {
	db *pgxpool.Pool
}

func NewBRLobbyResultRepo(db *pgxpool.Pool) model.BRLobbyResultRepository {
	return &brLobbyResultRepo{db: db}
}

func (r *brLobbyResultRepo) FindByID(ctx context.Context, id uuid.UUID) (*model.BRLobbyResult, error) {
	res := &model.BRLobbyResult{}
	err := r.db.QueryRow(ctx,
		`SELECT id, lobby_id, team_id, placement, kills, placement_points, kill_points, total_points,
		        COALESCE(status, 'normal'), COALESCE(penalty_points, 0), penalty_reason,
		        COALESCE(damage_dealt, 0), COALESCE(survival_bonus, 0)
		 FROM br_lobby_results WHERE id = $1`, id).
		Scan(&res.ID, &res.LobbyID, &res.TeamID, &res.Placement, &res.Kills,
			&res.PlacementPoints, &res.KillPoints, &res.TotalPoints,
			&res.Status, &res.PenaltyPoints, &res.PenaltyReason,
			&res.DamageDealt, &res.SurvivalBonus)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("FindByID: %w", err)
	}
	return res, nil
}

func (r *brLobbyResultRepo) Create(ctx context.Context, res *model.BRLobbyResult) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO br_lobby_results (id, lobby_id, team_id, placement, kills, placement_points, kill_points, total_points,
		        status, penalty_points, penalty_reason, damage_dealt, survival_bonus)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
		res.ID, res.LobbyID, res.TeamID, res.Placement, res.Kills,
		res.PlacementPoints, res.KillPoints, res.TotalPoints,
		res.Status, res.PenaltyPoints, res.PenaltyReason, res.DamageDealt, res.SurvivalBonus)
	if err != nil {
		return fmt.Errorf("Create: %w", err)
	}
	return nil
}

func (r *brLobbyResultRepo) Update(ctx context.Context, res *model.BRLobbyResult) error {
	_, err := r.db.Exec(ctx,
		`UPDATE br_lobby_results SET placement = $2, kills = $3, placement_points = $4,
		        kill_points = $5, total_points = $6,
		        status = $7, penalty_points = $8, penalty_reason = $9,
		        damage_dealt = $10, survival_bonus = $11
		 WHERE id = $1`,
		res.ID, res.Placement, res.Kills, res.PlacementPoints, res.KillPoints, res.TotalPoints,
		res.Status, res.PenaltyPoints, res.PenaltyReason, res.DamageDealt, res.SurvivalBonus)
	if err != nil {
		return fmt.Errorf("Update: %w", err)
	}
	return nil
}

func (r *brLobbyResultRepo) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.Exec(ctx, `DELETE FROM br_lobby_results WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("Delete: %w", err)
	}
	return nil
}

func (r *brLobbyResultRepo) ListByLobby(ctx context.Context, lobbyID uuid.UUID) ([]*model.BRLobbyResult, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, lobby_id, team_id, placement, kills, placement_points, kill_points, total_points,
		        COALESCE(status, 'normal'), COALESCE(penalty_points, 0), penalty_reason,
		        COALESCE(damage_dealt, 0), COALESCE(survival_bonus, 0)
		 FROM br_lobby_results WHERE lobby_id = $1
		 ORDER BY placement ASC`, lobbyID)
	if err != nil {
		return nil, fmt.Errorf("ListByLobby: %w", err)
	}
	defer rows.Close()

	var results []*model.BRLobbyResult
	for rows.Next() {
		res := &model.BRLobbyResult{}
		if err := rows.Scan(&res.ID, &res.LobbyID, &res.TeamID, &res.Placement, &res.Kills,
			&res.PlacementPoints, &res.KillPoints, &res.TotalPoints,
			&res.Status, &res.PenaltyPoints, &res.PenaltyReason,
			&res.DamageDealt, &res.SurvivalBonus); err != nil {
			return nil, fmt.Errorf("ListByLobby scan: %w", err)
		}
		results = append(results, res)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("ListByLobby rows: %w", err)
	}

	return results, nil
}

// ListByTournament fetches all results for every lobby in a tournament in one query,
// avoiding the N+1 pattern of calling ListByLobby for each lobby individually.
func (r *brLobbyResultRepo) ListByTournament(ctx context.Context, tournamentID uuid.UUID) ([]*model.BRLobbyResult, error) {
	rows, err := r.db.Query(ctx,
		`SELECT r.id, r.lobby_id, r.team_id, r.placement, r.kills, r.placement_points, r.kill_points, r.total_points,
		        COALESCE(r.status, 'normal'), COALESCE(r.penalty_points, 0), r.penalty_reason,
		        COALESCE(r.damage_dealt, 0), COALESCE(r.survival_bonus, 0)
		 FROM br_lobby_results r
		 JOIN br_lobbies l ON l.id = r.lobby_id
		 WHERE l.tournament_id = $1
		 ORDER BY r.lobby_id, r.placement ASC`, tournamentID)
	if err != nil {
		return nil, fmt.Errorf("ListByTournament: %w", err)
	}
	defer rows.Close()

	var results []*model.BRLobbyResult
	for rows.Next() {
		res := &model.BRLobbyResult{}
		if err := rows.Scan(&res.ID, &res.LobbyID, &res.TeamID, &res.Placement, &res.Kills,
			&res.PlacementPoints, &res.KillPoints, &res.TotalPoints,
			&res.Status, &res.PenaltyPoints, &res.PenaltyReason,
			&res.DamageDealt, &res.SurvivalBonus); err != nil {
			return nil, fmt.Errorf("ListByTournament scan: %w", err)
		}
		results = append(results, res)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("ListByTournament rows: %w", err)
	}

	return results, nil
}

func (r *brLobbyResultRepo) ListByTeam(ctx context.Context, teamID uuid.UUID) ([]*model.BRLobbyResult, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, lobby_id, team_id, placement, kills, placement_points, kill_points, total_points,
		        COALESCE(status, 'normal'), COALESCE(penalty_points, 0), penalty_reason,
		        COALESCE(damage_dealt, 0), COALESCE(survival_bonus, 0)
		 FROM br_lobby_results WHERE team_id = $1
		 ORDER BY lobby_id`, teamID)
	if err != nil {
		return nil, fmt.Errorf("ListByTeam: %w", err)
	}
	defer rows.Close()

	var results []*model.BRLobbyResult
	for rows.Next() {
		res := &model.BRLobbyResult{}
		if err := rows.Scan(&res.ID, &res.LobbyID, &res.TeamID, &res.Placement, &res.Kills,
			&res.PlacementPoints, &res.KillPoints, &res.TotalPoints,
			&res.Status, &res.PenaltyPoints, &res.PenaltyReason,
			&res.DamageDealt, &res.SurvivalBonus); err != nil {
			return nil, fmt.Errorf("ListByTeam scan: %w", err)
		}
		results = append(results, res)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("ListByTeam rows: %w", err)
	}

	return results, nil
}

// BulkCreate inserts multiple results in a batch
func (r *brLobbyResultRepo) BulkCreate(ctx context.Context, results []*model.BRLobbyResult) error {
	if len(results) == 0 {
		return nil
	}

	batch := &pgx.Batch{}
	for _, res := range results {
		batch.Queue(
			`INSERT INTO br_lobby_results (id, lobby_id, team_id, placement, kills, placement_points, kill_points, total_points,
			        status, penalty_points, penalty_reason, damage_dealt, survival_bonus)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
			res.ID, res.LobbyID, res.TeamID, res.Placement, res.Kills,
			res.PlacementPoints, res.KillPoints, res.TotalPoints,
			res.Status, res.PenaltyPoints, res.PenaltyReason, res.DamageDealt, res.SurvivalBonus)
	}

	br := r.db.SendBatch(ctx, batch)
	defer br.Close()

	for range results {
		if _, err := br.Exec(); err != nil {
			return fmt.Errorf("BulkCreate: %w", err)
		}
	}

	return nil
}

// FindByTeamAndLobby finds a result by team and lobby
func (r *brLobbyResultRepo) FindByTeamAndLobby(ctx context.Context, teamID, lobbyID uuid.UUID) (*model.BRLobbyResult, error) {
	res := &model.BRLobbyResult{}
	err := r.db.QueryRow(ctx,
		`SELECT id, lobby_id, team_id, placement, kills, placement_points, kill_points, total_points,
		        COALESCE(status, 'normal'), COALESCE(penalty_points, 0), penalty_reason,
		        COALESCE(damage_dealt, 0), COALESCE(survival_bonus, 0)
		 FROM br_lobby_results WHERE team_id = $1 AND lobby_id = $2`, teamID, lobbyID).
		Scan(&res.ID, &res.LobbyID, &res.TeamID, &res.Placement, &res.Kills,
			&res.PlacementPoints, &res.KillPoints, &res.TotalPoints,
			&res.Status, &res.PenaltyPoints, &res.PenaltyReason,
			&res.DamageDealt, &res.SurvivalBonus)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("FindByTeamAndLobby: %w", err)
	}
	return res, nil
}
