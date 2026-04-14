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
		`SELECT id, lobby_id, team_id, COALESCE(map_number, 1), placement, kills, placement_points, kill_points, total_points,
		        COALESCE(status, 'normal'), COALESCE(penalty_points, 0), penalty_reason,
		        COALESCE(damage_dealt, 0), COALESCE(survival_bonus, 0)
		 FROM br_lobby_results WHERE id = $1`, id).
		Scan(&res.ID, &res.LobbyID, &res.TeamID, &res.MapNumber, &res.Placement, &res.Kills,
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
	mapNum := res.MapNumber
	if mapNum < 1 {
		mapNum = 1
	}
	_, err := r.db.Exec(ctx,
		`INSERT INTO br_lobby_results (id, lobby_id, team_id, map_number, placement, kills, placement_points, kill_points, total_points,
		        status, penalty_points, penalty_reason, damage_dealt, survival_bonus)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
		res.ID, res.LobbyID, res.TeamID, mapNum, res.Placement, res.Kills,
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

// DeleteByLobbyAndMap deletes all results for a specific lobby+map combination (used on re-input).
func (r *brLobbyResultRepo) DeleteByLobbyAndMap(ctx context.Context, lobbyID uuid.UUID, mapNumber int) error {
	_, err := r.db.Exec(ctx,
		`DELETE FROM br_lobby_results WHERE lobby_id = $1 AND map_number = $2`, lobbyID, mapNumber)
	if err != nil {
		return fmt.Errorf("DeleteByLobbyAndMap: %w", err)
	}
	return nil
}

func (r *brLobbyResultRepo) ListByLobby(ctx context.Context, lobbyID uuid.UUID) ([]*model.BRLobbyResult, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, lobby_id, team_id, COALESCE(map_number, 1), placement, kills, placement_points, kill_points, total_points,
		        COALESCE(status, 'normal'), COALESCE(penalty_points, 0), penalty_reason,
		        COALESCE(damage_dealt, 0), COALESCE(survival_bonus, 0)
		 FROM br_lobby_results WHERE lobby_id = $1
		 ORDER BY map_number ASC, placement ASC`, lobbyID)
	if err != nil {
		return nil, fmt.Errorf("ListByLobby: %w", err)
	}
	defer rows.Close()

	var results []*model.BRLobbyResult
	for rows.Next() {
		res := &model.BRLobbyResult{}
		if err := rows.Scan(&res.ID, &res.LobbyID, &res.TeamID, &res.MapNumber, &res.Placement, &res.Kills,
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

// ListByLobbyAndMap returns results for a specific map within a lobby.
func (r *brLobbyResultRepo) ListByLobbyAndMap(ctx context.Context, lobbyID uuid.UUID, mapNumber int) ([]*model.BRLobbyResult, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, lobby_id, team_id, COALESCE(map_number, 1), placement, kills, placement_points, kill_points, total_points,
		        COALESCE(status, 'normal'), COALESCE(penalty_points, 0), penalty_reason,
		        COALESCE(damage_dealt, 0), COALESCE(survival_bonus, 0)
		 FROM br_lobby_results WHERE lobby_id = $1 AND map_number = $2
		 ORDER BY placement ASC`, lobbyID, mapNumber)
	if err != nil {
		return nil, fmt.Errorf("ListByLobbyAndMap: %w", err)
	}
	defer rows.Close()

	var results []*model.BRLobbyResult
	for rows.Next() {
		res := &model.BRLobbyResult{}
		if err := rows.Scan(&res.ID, &res.LobbyID, &res.TeamID, &res.MapNumber, &res.Placement, &res.Kills,
			&res.PlacementPoints, &res.KillPoints, &res.TotalPoints,
			&res.Status, &res.PenaltyPoints, &res.PenaltyReason,
			&res.DamageDealt, &res.SurvivalBonus); err != nil {
			return nil, fmt.Errorf("ListByLobbyAndMap scan: %w", err)
		}
		results = append(results, res)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("ListByLobbyAndMap rows: %w", err)
	}

	return results, nil
}

// ListByTournament fetches all results for every lobby in a tournament in one query,
// avoiding the N+1 pattern of calling ListByLobby for each lobby individually.
func (r *brLobbyResultRepo) ListByTournament(ctx context.Context, tournamentID uuid.UUID) ([]*model.BRLobbyResult, error) {
	rows, err := r.db.Query(ctx,
		`SELECT r.id, r.lobby_id, r.team_id, COALESCE(r.map_number, 1), r.placement, r.kills, r.placement_points, r.kill_points, r.total_points,
		        COALESCE(r.status, 'normal'), COALESCE(r.penalty_points, 0), r.penalty_reason,
		        COALESCE(r.damage_dealt, 0), COALESCE(r.survival_bonus, 0)
		 FROM br_lobby_results r
		 JOIN br_lobbies l ON l.id = r.lobby_id
		 WHERE l.tournament_id = $1
		 ORDER BY r.lobby_id, r.map_number ASC, r.placement ASC`, tournamentID)
	if err != nil {
		return nil, fmt.Errorf("ListByTournament: %w", err)
	}
	defer rows.Close()

	var results []*model.BRLobbyResult
	for rows.Next() {
		res := &model.BRLobbyResult{}
		if err := rows.Scan(&res.ID, &res.LobbyID, &res.TeamID, &res.MapNumber, &res.Placement, &res.Kills,
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
		`SELECT id, lobby_id, team_id, COALESCE(map_number, 1), placement, kills, placement_points, kill_points, total_points,
		        COALESCE(status, 'normal'), COALESCE(penalty_points, 0), penalty_reason,
		        COALESCE(damage_dealt, 0), COALESCE(survival_bonus, 0)
		 FROM br_lobby_results WHERE team_id = $1
		 ORDER BY lobby_id, map_number ASC`, teamID)
	if err != nil {
		return nil, fmt.Errorf("ListByTeam: %w", err)
	}
	defer rows.Close()

	var results []*model.BRLobbyResult
	for rows.Next() {
		res := &model.BRLobbyResult{}
		if err := rows.Scan(&res.ID, &res.LobbyID, &res.TeamID, &res.MapNumber, &res.Placement, &res.Kills,
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
		mapNum := res.MapNumber
		if mapNum < 1 {
			mapNum = 1
		}
		batch.Queue(
			`INSERT INTO br_lobby_results (id, lobby_id, team_id, map_number, placement, kills, placement_points, kill_points, total_points,
			        status, penalty_points, penalty_reason, damage_dealt, survival_bonus)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
			res.ID, res.LobbyID, res.TeamID, mapNum, res.Placement, res.Kills,
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

// FindByTeamAndLobby finds the first result by team and lobby (map 1 by default for backward compat)
func (r *brLobbyResultRepo) FindByTeamAndLobby(ctx context.Context, teamID, lobbyID uuid.UUID) (*model.BRLobbyResult, error) {
	res := &model.BRLobbyResult{}
	err := r.db.QueryRow(ctx,
		`SELECT id, lobby_id, team_id, COALESCE(map_number, 1), placement, kills, placement_points, kill_points, total_points,
		        COALESCE(status, 'normal'), COALESCE(penalty_points, 0), penalty_reason,
		        COALESCE(damage_dealt, 0), COALESCE(survival_bonus, 0)
		 FROM br_lobby_results WHERE team_id = $1 AND lobby_id = $2
		 ORDER BY map_number ASC LIMIT 1`, teamID, lobbyID).
		Scan(&res.ID, &res.LobbyID, &res.TeamID, &res.MapNumber, &res.Placement, &res.Kills,
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

// FindByTeamLobbyAndMap finds the result for a specific team, lobby, and map number.
func (r *brLobbyResultRepo) FindByTeamLobbyAndMap(ctx context.Context, teamID, lobbyID uuid.UUID, mapNumber int) (*model.BRLobbyResult, error) {
	res := &model.BRLobbyResult{}
	err := r.db.QueryRow(ctx,
		`SELECT id, lobby_id, team_id, COALESCE(map_number, 1), placement, kills, placement_points, kill_points, total_points,
		        COALESCE(status, 'normal'), COALESCE(penalty_points, 0), penalty_reason,
		        COALESCE(damage_dealt, 0), COALESCE(survival_bonus, 0)
		 FROM br_lobby_results WHERE team_id = $1 AND lobby_id = $2 AND COALESCE(map_number, 1) = $3
		 LIMIT 1`, teamID, lobbyID, mapNumber).
		Scan(&res.ID, &res.LobbyID, &res.TeamID, &res.MapNumber, &res.Placement, &res.Kills,
			&res.PlacementPoints, &res.KillPoints, &res.TotalPoints,
			&res.Status, &res.PenaltyPoints, &res.PenaltyReason,
			&res.DamageDealt, &res.SurvivalBonus)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("FindByTeamLobbyAndMap: %w", err)
	}
	return res, nil
}

// CountMapResultsByLobby returns a map of map_number -> team count for a lobby.
// Used to determine which maps have been submitted.
func (r *brLobbyResultRepo) CountMapResultsByLobby(ctx context.Context, lobbyID uuid.UUID) (map[int]int, error) {
	rows, err := r.db.Query(ctx,
		`SELECT map_number, COUNT(*) FROM br_lobby_results WHERE lobby_id = $1 GROUP BY map_number`,
		lobbyID)
	if err != nil {
		return nil, fmt.Errorf("CountMapResultsByLobby: %w", err)
	}
	defer rows.Close()

	counts := make(map[int]int)
	for rows.Next() {
		var mapNum, count int
		if err := rows.Scan(&mapNum, &count); err != nil {
			return nil, fmt.Errorf("CountMapResultsByLobby scan: %w", err)
		}
		counts[mapNum] = count
	}
	return counts, nil
}
