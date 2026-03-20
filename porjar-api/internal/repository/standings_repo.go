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

type standingsRepo struct {
	db *pgxpool.Pool
}

func NewStandingsRepo(db *pgxpool.Pool) model.StandingsRepository {
	return &standingsRepo{db: db}
}

func (r *standingsRepo) FindByID(ctx context.Context, id uuid.UUID) (*model.Standing, error) {
	s := &model.Standing{}
	err := r.db.QueryRow(ctx,
		`SELECT id, tournament_id, team_id, group_name, matches_played, wins, losses, draws,
		        rounds_won, rounds_lost, total_points, total_kills, total_placement_points,
		        best_placement, avg_placement, rank_position, is_eliminated
		 FROM standings WHERE id = $1`, id).
		Scan(&s.ID, &s.TournamentID, &s.TeamID, &s.GroupName, &s.MatchesPlayed,
			&s.Wins, &s.Losses, &s.Draws, &s.RoundsWon, &s.RoundsLost,
			&s.TotalPoints, &s.TotalKills, &s.TotalPlacementPoints,
			&s.BestPlacement, &s.AvgPlacement, &s.RankPosition, &s.IsEliminated)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("FindByID: %w", err)
	}
	return s, nil
}

func (r *standingsRepo) Create(ctx context.Context, s *model.Standing) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO standings (id, tournament_id, team_id, group_name, matches_played, wins, losses, draws,
		        rounds_won, rounds_lost, total_points, total_kills, total_placement_points,
		        best_placement, avg_placement, rank_position, is_eliminated)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
		s.ID, s.TournamentID, s.TeamID, s.GroupName, s.MatchesPlayed,
		s.Wins, s.Losses, s.Draws, s.RoundsWon, s.RoundsLost,
		s.TotalPoints, s.TotalKills, s.TotalPlacementPoints,
		s.BestPlacement, s.AvgPlacement, s.RankPosition, s.IsEliminated)
	if err != nil {
		return fmt.Errorf("Create: %w", err)
	}
	return nil
}

func (r *standingsRepo) Update(ctx context.Context, s *model.Standing) error {
	_, err := r.db.Exec(ctx,
		`UPDATE standings SET group_name = $2, matches_played = $3, wins = $4, losses = $5, draws = $6,
		        rounds_won = $7, rounds_lost = $8, total_points = $9, total_kills = $10,
		        total_placement_points = $11, best_placement = $12, avg_placement = $13,
		        rank_position = $14, is_eliminated = $15
		 WHERE id = $1`,
		s.ID, s.GroupName, s.MatchesPlayed, s.Wins, s.Losses, s.Draws,
		s.RoundsWon, s.RoundsLost, s.TotalPoints, s.TotalKills,
		s.TotalPlacementPoints, s.BestPlacement, s.AvgPlacement,
		s.RankPosition, s.IsEliminated)
	if err != nil {
		return fmt.Errorf("Update: %w", err)
	}
	return nil
}

func (r *standingsRepo) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.Exec(ctx, `DELETE FROM standings WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("Delete: %w", err)
	}
	return nil
}

func (r *standingsRepo) FindByTournamentAndTeam(ctx context.Context, tournamentID, teamID uuid.UUID) (*model.Standing, error) {
	s := &model.Standing{}
	err := r.db.QueryRow(ctx,
		`SELECT id, tournament_id, team_id, group_name, matches_played, wins, losses, draws,
		        rounds_won, rounds_lost, total_points, total_kills, total_placement_points,
		        best_placement, avg_placement, rank_position, is_eliminated
		 FROM standings WHERE tournament_id = $1 AND team_id = $2`, tournamentID, teamID).
		Scan(&s.ID, &s.TournamentID, &s.TeamID, &s.GroupName, &s.MatchesPlayed,
			&s.Wins, &s.Losses, &s.Draws, &s.RoundsWon, &s.RoundsLost,
			&s.TotalPoints, &s.TotalKills, &s.TotalPlacementPoints,
			&s.BestPlacement, &s.AvgPlacement, &s.RankPosition, &s.IsEliminated)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("FindByTournamentAndTeam: %w", err)
	}
	return s, nil
}

func (r *standingsRepo) ListByTournament(ctx context.Context, tournamentID uuid.UUID) ([]*model.Standing, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, tournament_id, team_id, group_name, matches_played, wins, losses, draws,
		        rounds_won, rounds_lost, total_points, total_kills, total_placement_points,
		        best_placement, avg_placement, rank_position, is_eliminated
		 FROM standings WHERE tournament_id = $1
		 ORDER BY rank_position ASC NULLS LAST, total_points DESC, total_kills DESC`, tournamentID)
	if err != nil {
		return nil, fmt.Errorf("ListByTournament: %w", err)
	}
	defer rows.Close()

	var standings []*model.Standing
	for rows.Next() {
		s := &model.Standing{}
		if err := rows.Scan(&s.ID, &s.TournamentID, &s.TeamID, &s.GroupName, &s.MatchesPlayed,
			&s.Wins, &s.Losses, &s.Draws, &s.RoundsWon, &s.RoundsLost,
			&s.TotalPoints, &s.TotalKills, &s.TotalPlacementPoints,
			&s.BestPlacement, &s.AvgPlacement, &s.RankPosition, &s.IsEliminated); err != nil {
			return nil, fmt.Errorf("ListByTournament scan: %w", err)
		}
		standings = append(standings, s)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("ListByTournament rows: %w", err)
	}

	return standings, nil
}

func (r *standingsRepo) ListByTournamentAndGroup(ctx context.Context, tournamentID uuid.UUID, groupName string) ([]*model.Standing, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, tournament_id, team_id, group_name, matches_played, wins, losses, draws,
		        rounds_won, rounds_lost, total_points, total_kills, total_placement_points,
		        best_placement, avg_placement, rank_position, is_eliminated
		 FROM standings WHERE tournament_id = $1 AND group_name = $2
		 ORDER BY rank_position ASC NULLS LAST, total_points DESC, total_kills DESC`, tournamentID, groupName)
	if err != nil {
		return nil, fmt.Errorf("ListByTournamentAndGroup: %w", err)
	}
	defer rows.Close()

	var standings []*model.Standing
	for rows.Next() {
		s := &model.Standing{}
		if err := rows.Scan(&s.ID, &s.TournamentID, &s.TeamID, &s.GroupName, &s.MatchesPlayed,
			&s.Wins, &s.Losses, &s.Draws, &s.RoundsWon, &s.RoundsLost,
			&s.TotalPoints, &s.TotalKills, &s.TotalPlacementPoints,
			&s.BestPlacement, &s.AvgPlacement, &s.RankPosition, &s.IsEliminated); err != nil {
			return nil, fmt.Errorf("ListByTournamentAndGroup scan: %w", err)
		}
		standings = append(standings, s)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("ListByTournamentAndGroup rows: %w", err)
	}

	return standings, nil
}

// Upsert inserts or updates a standing based on tournament_id + team_id uniqueness
func (r *standingsRepo) Upsert(ctx context.Context, s *model.Standing) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO standings (id, tournament_id, team_id, group_name, matches_played, wins, losses, draws,
		        rounds_won, rounds_lost, total_points, total_kills, total_placement_points,
		        best_placement, avg_placement, rank_position, is_eliminated)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
		 ON CONFLICT (tournament_id, team_id) DO UPDATE SET
		        group_name = EXCLUDED.group_name,
		        matches_played = EXCLUDED.matches_played,
		        wins = EXCLUDED.wins,
		        losses = EXCLUDED.losses,
		        draws = EXCLUDED.draws,
		        rounds_won = EXCLUDED.rounds_won,
		        rounds_lost = EXCLUDED.rounds_lost,
		        total_points = EXCLUDED.total_points,
		        total_kills = EXCLUDED.total_kills,
		        total_placement_points = EXCLUDED.total_placement_points,
		        best_placement = EXCLUDED.best_placement,
		        avg_placement = EXCLUDED.avg_placement,
		        rank_position = EXCLUDED.rank_position,
		        is_eliminated = EXCLUDED.is_eliminated`,
		s.ID, s.TournamentID, s.TeamID, s.GroupName, s.MatchesPlayed,
		s.Wins, s.Losses, s.Draws, s.RoundsWon, s.RoundsLost,
		s.TotalPoints, s.TotalKills, s.TotalPlacementPoints,
		s.BestPlacement, s.AvgPlacement, s.RankPosition, s.IsEliminated)
	if err != nil {
		return fmt.Errorf("Upsert: %w", err)
	}
	return nil
}

// BulkUpsert inserts or updates multiple standings in a batch
func (r *standingsRepo) BulkUpsert(ctx context.Context, standings []*model.Standing) error {
	if len(standings) == 0 {
		return nil
	}

	batch := &pgx.Batch{}
	for _, s := range standings {
		batch.Queue(
			`INSERT INTO standings (id, tournament_id, team_id, group_name, matches_played, wins, losses, draws,
			        rounds_won, rounds_lost, total_points, total_kills, total_placement_points,
			        best_placement, avg_placement, rank_position, is_eliminated)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
			 ON CONFLICT (tournament_id, team_id) DO UPDATE SET
			        group_name = EXCLUDED.group_name,
			        matches_played = EXCLUDED.matches_played,
			        wins = EXCLUDED.wins,
			        losses = EXCLUDED.losses,
			        draws = EXCLUDED.draws,
			        rounds_won = EXCLUDED.rounds_won,
			        rounds_lost = EXCLUDED.rounds_lost,
			        total_points = EXCLUDED.total_points,
			        total_kills = EXCLUDED.total_kills,
			        total_placement_points = EXCLUDED.total_placement_points,
			        best_placement = EXCLUDED.best_placement,
			        avg_placement = EXCLUDED.avg_placement,
			        rank_position = EXCLUDED.rank_position,
			        is_eliminated = EXCLUDED.is_eliminated`,
			s.ID, s.TournamentID, s.TeamID, s.GroupName, s.MatchesPlayed,
			s.Wins, s.Losses, s.Draws, s.RoundsWon, s.RoundsLost,
			s.TotalPoints, s.TotalKills, s.TotalPlacementPoints,
			s.BestPlacement, s.AvgPlacement, s.RankPosition, s.IsEliminated)
	}

	br := r.db.SendBatch(ctx, batch)
	defer br.Close()

	for range standings {
		if _, err := br.Exec(); err != nil {
			return fmt.Errorf("BulkUpsert: %w", err)
		}
	}

	return nil
}

// IncrementBracketStats atomically inserts or increments wins/losses and matches_played
// for a team in a tournament, avoiding the read-modify-write race in UpdateAfterBracketMatch.
func (r *standingsRepo) IncrementBracketStats(ctx context.Context, tournamentID, teamID uuid.UUID, isWin bool) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO standings (id, tournament_id, team_id, matches_played, wins, losses)
		 VALUES (gen_random_uuid(), $1, $2, 1,
		     CASE WHEN $3 THEN 1 ELSE 0 END,
		     CASE WHEN $3 THEN 0 ELSE 1 END)
		 ON CONFLICT (tournament_id, team_id) DO UPDATE SET
		     matches_played = standings.matches_played + 1,
		     wins    = standings.wins    + CASE WHEN $3 THEN 1 ELSE 0 END,
		     losses  = standings.losses  + CASE WHEN $3 THEN 0 ELSE 1 END`,
		tournamentID, teamID, isWin)
	if err != nil {
		return fmt.Errorf("IncrementBracketStats: %w", err)
	}
	return nil
}

// UpdateRankPositions reorders standings by total_points DESC, total_kills DESC
func (r *standingsRepo) UpdateRankPositions(ctx context.Context, tournamentID uuid.UUID) error {
	_, err := r.db.Exec(ctx,
		`UPDATE standings SET rank_position = sub.rank
		 FROM (
		     SELECT id, ROW_NUMBER() OVER (ORDER BY total_points DESC, total_kills DESC, best_placement ASC NULLS LAST) as rank
		     FROM standings
		     WHERE tournament_id = $1
		 ) sub
		 WHERE standings.id = sub.id`, tournamentID)
	if err != nil {
		return fmt.Errorf("UpdateRankPositions: %w", err)
	}
	return nil
}
