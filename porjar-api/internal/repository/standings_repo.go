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
		        best_placement, avg_placement, rank_position, is_eliminated, penalty_points, wwcd_count
		 FROM standings WHERE id = $1`, id).
		Scan(&s.ID, &s.TournamentID, &s.TeamID, &s.GroupName, &s.MatchesPlayed,
			&s.Wins, &s.Losses, &s.Draws, &s.RoundsWon, &s.RoundsLost,
			&s.TotalPoints, &s.TotalKills, &s.TotalPlacementPoints,
			&s.BestPlacement, &s.AvgPlacement, &s.RankPosition, &s.IsEliminated, &s.PenaltyPoints, &s.WWCDCount)
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
		        best_placement, avg_placement, rank_position, is_eliminated, penalty_points, wwcd_count)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
		s.ID, s.TournamentID, s.TeamID, s.GroupName, s.MatchesPlayed,
		s.Wins, s.Losses, s.Draws, s.RoundsWon, s.RoundsLost,
		s.TotalPoints, s.TotalKills, s.TotalPlacementPoints,
		s.BestPlacement, s.AvgPlacement, s.RankPosition, s.IsEliminated, s.PenaltyPoints, s.WWCDCount)
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
		        rank_position = $14, is_eliminated = $15, penalty_points = $16, wwcd_count = $17
		 WHERE id = $1`,
		s.ID, s.GroupName, s.MatchesPlayed, s.Wins, s.Losses, s.Draws,
		s.RoundsWon, s.RoundsLost, s.TotalPoints, s.TotalKills,
		s.TotalPlacementPoints, s.BestPlacement, s.AvgPlacement,
		s.RankPosition, s.IsEliminated, s.PenaltyPoints, s.WWCDCount)
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
		        best_placement, avg_placement, rank_position, is_eliminated, penalty_points, wwcd_count
		 FROM standings WHERE tournament_id = $1 AND team_id = $2`, tournamentID, teamID).
		Scan(&s.ID, &s.TournamentID, &s.TeamID, &s.GroupName, &s.MatchesPlayed,
			&s.Wins, &s.Losses, &s.Draws, &s.RoundsWon, &s.RoundsLost,
			&s.TotalPoints, &s.TotalKills, &s.TotalPlacementPoints,
			&s.BestPlacement, &s.AvgPlacement, &s.RankPosition, &s.IsEliminated, &s.PenaltyPoints, &s.WWCDCount)
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
		        best_placement, avg_placement, rank_position, is_eliminated, penalty_points, wwcd_count
		 FROM standings WHERE tournament_id = $1
		 ORDER BY rank_position ASC NULLS LAST, total_points DESC, wwcd_count DESC, total_placement_points DESC, total_kills DESC
		 LIMIT 500`, tournamentID)
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
			&s.BestPlacement, &s.AvgPlacement, &s.RankPosition, &s.IsEliminated, &s.PenaltyPoints, &s.WWCDCount); err != nil {
			return nil, fmt.Errorf("ListByTournament scan: %w", err)
		}
		standings = append(standings, s)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("ListByTournament rows: %w", err)
	}

	return standings, nil
}

func (r *standingsRepo) ListWithTeamsByTournament(ctx context.Context, tournamentID uuid.UUID) ([]*model.StandingWithTeam, error) {
	rows, err := r.db.Query(ctx,
		`SELECT s.id, s.tournament_id, s.group_name, s.matches_played, s.wins, s.losses, s.draws,
		        s.rounds_won, s.rounds_lost, s.total_points, s.total_kills, s.total_placement_points,
		        s.best_placement, s.avg_placement, s.rank_position, s.is_eliminated, s.penalty_points, s.wwcd_count,
		        t.id, t.name, t.seed, t.logo_url,
		        sc.name, sc.logo_url
		 FROM standings s
		 JOIN teams t ON t.id = s.team_id
		 LEFT JOIN schools sc ON sc.id = t.school_id
		 WHERE s.tournament_id = $1
		 ORDER BY s.rank_position ASC NULLS LAST, s.total_points DESC, s.wwcd_count DESC, s.total_placement_points DESC, s.total_kills DESC
		 LIMIT 500`, tournamentID)
	if err != nil {
		return nil, fmt.Errorf("ListWithTeamsByTournament: %w", err)
	}
	defer rows.Close()

	var standings []*model.StandingWithTeam
	for rows.Next() {
		s := &model.StandingWithTeam{}
		if err := rows.Scan(
			&s.ID, &s.TournamentID, &s.GroupName, &s.MatchesPlayed,
			&s.Wins, &s.Losses, &s.Draws, &s.RoundsWon, &s.RoundsLost,
			&s.TotalPoints, &s.TotalKills, &s.TotalPlacementPoints,
			&s.BestPlacement, &s.AvgPlacement, &s.RankPosition, &s.IsEliminated, &s.PenaltyPoints, &s.WWCDCount,
			&s.Team.ID, &s.Team.Name, &s.Team.Seed, &s.Team.LogoURL,
			&s.Team.SchoolName, &s.Team.SchoolLogoURL,
		); err != nil {
			return nil, fmt.Errorf("ListWithTeamsByTournament scan: %w", err)
		}
		standings = append(standings, s)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("ListWithTeamsByTournament rows: %w", err)
	}

	return standings, nil
}

func (r *standingsRepo) ListByTournamentAndGroup(ctx context.Context, tournamentID uuid.UUID, groupName string) ([]*model.Standing, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, tournament_id, team_id, group_name, matches_played, wins, losses, draws,
		        rounds_won, rounds_lost, total_points, total_kills, total_placement_points,
		        best_placement, avg_placement, rank_position, is_eliminated, penalty_points, wwcd_count
		 FROM standings WHERE tournament_id = $1 AND group_name = $2
		 ORDER BY rank_position ASC NULLS LAST, total_points DESC, wwcd_count DESC, total_placement_points DESC, total_kills DESC
		 LIMIT 500`, tournamentID, groupName)
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
			&s.BestPlacement, &s.AvgPlacement, &s.RankPosition, &s.IsEliminated, &s.PenaltyPoints, &s.WWCDCount); err != nil {
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
		        best_placement, avg_placement, rank_position, is_eliminated, penalty_points, wwcd_count)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
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
		        is_eliminated = EXCLUDED.is_eliminated,
		        penalty_points = EXCLUDED.penalty_points,
		        wwcd_count = EXCLUDED.wwcd_count`,
		s.ID, s.TournamentID, s.TeamID, s.GroupName, s.MatchesPlayed,
		s.Wins, s.Losses, s.Draws, s.RoundsWon, s.RoundsLost,
		s.TotalPoints, s.TotalKills, s.TotalPlacementPoints,
		s.BestPlacement, s.AvgPlacement, s.RankPosition, s.IsEliminated, s.PenaltyPoints, s.WWCDCount)
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
			        best_placement, avg_placement, rank_position, is_eliminated, penalty_points, wwcd_count)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
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
			        is_eliminated = EXCLUDED.is_eliminated,
			        penalty_points = EXCLUDED.penalty_points,
			        wwcd_count = EXCLUDED.wwcd_count`,
			s.ID, s.TournamentID, s.TeamID, s.GroupName, s.MatchesPlayed,
			s.Wins, s.Losses, s.Draws, s.RoundsWon, s.RoundsLost,
			s.TotalPoints, s.TotalKills, s.TotalPlacementPoints,
			s.BestPlacement, s.AvgPlacement, s.RankPosition, s.IsEliminated, s.PenaltyPoints, s.WWCDCount)
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

func (r *standingsRepo) DeleteByTournament(ctx context.Context, tournamentID uuid.UUID) error {
	_, err := r.db.Exec(ctx, `DELETE FROM standings WHERE tournament_id = $1`, tournamentID)
	if err != nil {
		return fmt.Errorf("DeleteByTournament: %w", err)
	}
	return nil
}

// BulkMarkEliminated sets is_eliminated = true for all given teamIDs in a single UPDATE.
func (r *standingsRepo) BulkMarkEliminated(ctx context.Context, tournamentID uuid.UUID, teamIDs []uuid.UUID) error {
	if len(teamIDs) == 0 {
		return nil
	}
	_, err := r.db.Exec(ctx,
		`UPDATE standings SET is_eliminated = true
		 WHERE tournament_id = $1 AND team_id = ANY($2)`,
		tournamentID, teamIDs)
	if err != nil {
		return fmt.Errorf("BulkMarkEliminated: %w", err)
	}
	return nil
}

// validTiebreakerFields maps allowed tiebreaker keys to their SQL expressions.
var validTiebreakerFields = map[string]string{
	"wwcd":             "wwcd_count DESC",
	"placement_points": "total_placement_points DESC",
	"kills":            "total_kills DESC",
	"best_placement":   "best_placement ASC NULLS LAST",
}

// defaultTiebreakerOrder is used when no order is configured.
var defaultTiebreakerOrder = []string{"wwcd", "placement_points", "kills", "best_placement"}

// UpdateRankPositions reorders standings using a configurable tiebreaker order.
// After total_points DESC, each key in tiebreakerOrder maps to a SQL sort expression.
// Unknown keys are silently ignored; missing keys from the default set are appended.
func (r *standingsRepo) UpdateRankPositions(ctx context.Context, tournamentID uuid.UUID, tiebreakerOrder []string) error {
	if len(tiebreakerOrder) == 0 {
		tiebreakerOrder = defaultTiebreakerOrder
	}

	// Build ORDER BY: always start with total_points DESC
	orderParts := []string{"total_points DESC"}
	seen := map[string]bool{}
	for _, key := range tiebreakerOrder {
		if expr, ok := validTiebreakerFields[key]; ok && !seen[key] {
			orderParts = append(orderParts, expr)
			seen[key] = true
		}
	}
	// Ensure best_placement is always last as final tiebreaker
	if !seen["best_placement"] {
		orderParts = append(orderParts, validTiebreakerFields["best_placement"])
	}

	orderBy := ""
	for i, p := range orderParts {
		if i > 0 {
			orderBy += ", "
		}
		orderBy += p
	}

	query := fmt.Sprintf(`UPDATE standings SET rank_position = sub.rank
		 FROM (
		     SELECT id, ROW_NUMBER() OVER (ORDER BY %s) as rank
		     FROM standings
		     WHERE tournament_id = $1
		 ) sub
		 WHERE standings.id = sub.id`, orderBy)

	_, err := r.db.Exec(ctx, query, tournamentID)
	if err != nil {
		return fmt.Errorf("UpdateRankPositions: %w", err)
	}
	return nil
}
