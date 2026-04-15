package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/porjar-denpasar/porjar-api/internal/model"
)

type bracketRepo struct {
	db *pgxpool.Pool
}

func NewBracketRepo(db *pgxpool.Pool) model.BracketRepository {
	return &bracketRepo{db: db}
}

func (r *bracketRepo) FindByID(ctx context.Context, id uuid.UUID) (*model.BracketMatch, error) {
	m := &model.BracketMatch{}
	err := r.db.QueryRow(ctx,
		`SELECT id, tournament_id, round, match_number, bracket_position,
		        team_a_id, team_b_id, winner_id, loser_id, score_a, score_b,
		        status, scheduled_at, started_at, completed_at,
		        next_match_id, loser_next_match_id, stream_url, notes,
		        COALESCE(best_of, 1)
		 FROM bracket_matches WHERE id = $1`, id).
		Scan(&m.ID, &m.TournamentID, &m.Round, &m.MatchNumber, &m.BracketPosition,
			&m.TeamAID, &m.TeamBID, &m.WinnerID, &m.LoserID, &m.ScoreA, &m.ScoreB,
			&m.Status, &m.ScheduledAt, &m.StartedAt, &m.CompletedAt,
			&m.NextMatchID, &m.LoserNextMatchID, &m.StreamURL, &m.Notes,
			&m.BestOf)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("FindByID: %w", err)
	}
	return m, nil
}

func (r *bracketRepo) FindByIDs(ctx context.Context, ids []uuid.UUID) ([]*model.BracketMatch, error) {
	if len(ids) == 0 {
		return nil, nil
	}
	rows, err := r.db.Query(ctx,
		`SELECT id, tournament_id, round, match_number, bracket_position,
		        team_a_id, team_b_id, winner_id, loser_id, score_a, score_b,
		        status, scheduled_at, started_at, completed_at,
		        next_match_id, loser_next_match_id, stream_url, notes,
		        COALESCE(best_of, 1)
		 FROM bracket_matches WHERE id = ANY($1)`, ids)
	if err != nil {
		return nil, fmt.Errorf("FindByIDs: %w", err)
	}
	defer rows.Close()

	var matches []*model.BracketMatch
	for rows.Next() {
		m := &model.BracketMatch{}
		if err := rows.Scan(&m.ID, &m.TournamentID, &m.Round, &m.MatchNumber, &m.BracketPosition,
			&m.TeamAID, &m.TeamBID, &m.WinnerID, &m.LoserID, &m.ScoreA, &m.ScoreB,
			&m.Status, &m.ScheduledAt, &m.StartedAt, &m.CompletedAt,
			&m.NextMatchID, &m.LoserNextMatchID, &m.StreamURL, &m.Notes, &m.BestOf); err != nil {
			return nil, fmt.Errorf("FindByIDs scan: %w", err)
		}
		matches = append(matches, m)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("FindByIDs rows: %w", err)
	}
	return matches, nil
}

func (r *bracketRepo) Create(ctx context.Context, m *model.BracketMatch) error {
	bestOf := m.BestOf
	if bestOf <= 0 {
		bestOf = 1
	}
	_, err := r.db.Exec(ctx,
		`INSERT INTO bracket_matches (id, tournament_id, round, match_number, bracket_position,
		        team_a_id, team_b_id, winner_id, loser_id, score_a, score_b,
		        status, scheduled_at, started_at, completed_at,
		        next_match_id, loser_next_match_id, stream_url, notes, best_of)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)`,
		m.ID, m.TournamentID, m.Round, m.MatchNumber, m.BracketPosition,
		m.TeamAID, m.TeamBID, m.WinnerID, m.LoserID, m.ScoreA, m.ScoreB,
		m.Status, m.ScheduledAt, m.StartedAt, m.CompletedAt,
		m.NextMatchID, m.LoserNextMatchID, m.StreamURL, m.Notes, bestOf)
	if err != nil {
		return fmt.Errorf("Create: %w", err)
	}
	return nil
}

func (r *bracketRepo) Update(ctx context.Context, m *model.BracketMatch) error {
	_, err := r.db.Exec(ctx,
		`UPDATE bracket_matches
		 SET team_a_id = $2, team_b_id = $3, winner_id = $4, loser_id = $5,
		     score_a = $6, score_b = $7, status = $8, scheduled_at = $9,
		     started_at = $10, completed_at = $11, next_match_id = $12,
		     loser_next_match_id = $13, stream_url = $14, notes = $15
		 WHERE id = $1`,
		m.ID, m.TeamAID, m.TeamBID, m.WinnerID, m.LoserID,
		m.ScoreA, m.ScoreB, m.Status, m.ScheduledAt,
		m.StartedAt, m.CompletedAt, m.NextMatchID,
		m.LoserNextMatchID, m.StreamURL, m.Notes)
	if err != nil {
		return fmt.Errorf("Update: %w", err)
	}
	return nil
}

func (r *bracketRepo) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.Exec(ctx, `DELETE FROM bracket_matches WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("Delete: %w", err)
	}
	return nil
}

func (r *bracketRepo) ListByTournament(ctx context.Context, tournamentID uuid.UUID) ([]*model.BracketMatch, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, tournament_id, round, match_number, bracket_position,
		        team_a_id, team_b_id, winner_id, loser_id, score_a, score_b,
		        status, scheduled_at, started_at, completed_at,
		        next_match_id, loser_next_match_id, stream_url, notes,
		                COALESCE(best_of, 1)
		 FROM bracket_matches WHERE tournament_id = $1
		 ORDER BY round ASC, match_number ASC
		 LIMIT 1000`, tournamentID)
	if err != nil {
		return nil, fmt.Errorf("ListByTournament: %w", err)
	}
	defer rows.Close()

	var matches []*model.BracketMatch
	for rows.Next() {
		m := &model.BracketMatch{}
		if err := rows.Scan(&m.ID, &m.TournamentID, &m.Round, &m.MatchNumber, &m.BracketPosition,
			&m.TeamAID, &m.TeamBID, &m.WinnerID, &m.LoserID, &m.ScoreA, &m.ScoreB,
			&m.Status, &m.ScheduledAt, &m.StartedAt, &m.CompletedAt,
			&m.NextMatchID, &m.LoserNextMatchID, &m.StreamURL, &m.Notes, &m.BestOf); err != nil {
			return nil, fmt.Errorf("ListByTournament scan: %w", err)
		}
		matches = append(matches, m)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("ListByTournament rows: %w", err)
	}
	return matches, nil
}

func (r *bracketRepo) ListByTournamentAndRound(ctx context.Context, tournamentID uuid.UUID, round int) ([]*model.BracketMatch, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, tournament_id, round, match_number, bracket_position,
		        team_a_id, team_b_id, winner_id, loser_id, score_a, score_b,
		        status, scheduled_at, started_at, completed_at,
		        next_match_id, loser_next_match_id, stream_url, notes,
		                COALESCE(best_of, 1)
		 FROM bracket_matches WHERE tournament_id = $1 AND round = $2
		 ORDER BY match_number ASC`, tournamentID, round)
	if err != nil {
		return nil, fmt.Errorf("ListByTournamentAndRound: %w", err)
	}
	defer rows.Close()

	var matches []*model.BracketMatch
	for rows.Next() {
		m := &model.BracketMatch{}
		if err := rows.Scan(&m.ID, &m.TournamentID, &m.Round, &m.MatchNumber, &m.BracketPosition,
			&m.TeamAID, &m.TeamBID, &m.WinnerID, &m.LoserID, &m.ScoreA, &m.ScoreB,
			&m.Status, &m.ScheduledAt, &m.StartedAt, &m.CompletedAt,
			&m.NextMatchID, &m.LoserNextMatchID, &m.StreamURL, &m.Notes, &m.BestOf); err != nil {
			return nil, fmt.Errorf("ListByTournamentAndRound scan: %w", err)
		}
		matches = append(matches, m)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("ListByTournamentAndRound rows: %w", err)
	}
	return matches, nil
}

func (r *bracketRepo) ListByTeam(ctx context.Context, teamID uuid.UUID) ([]*model.BracketMatch, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, tournament_id, round, match_number, bracket_position,
		        team_a_id, team_b_id, winner_id, loser_id, score_a, score_b,
		        status, scheduled_at, started_at, completed_at,
		        next_match_id, loser_next_match_id, stream_url, notes,
		                COALESCE(best_of, 1)
		 FROM bracket_matches WHERE team_a_id = $1 OR team_b_id = $1
		 ORDER BY round ASC, match_number ASC`, teamID)
	if err != nil {
		return nil, fmt.Errorf("ListByTeam: %w", err)
	}
	defer rows.Close()

	var matches []*model.BracketMatch
	for rows.Next() {
		m := &model.BracketMatch{}
		if err := rows.Scan(&m.ID, &m.TournamentID, &m.Round, &m.MatchNumber, &m.BracketPosition,
			&m.TeamAID, &m.TeamBID, &m.WinnerID, &m.LoserID, &m.ScoreA, &m.ScoreB,
			&m.Status, &m.ScheduledAt, &m.StartedAt, &m.CompletedAt,
			&m.NextMatchID, &m.LoserNextMatchID, &m.StreamURL, &m.Notes, &m.BestOf); err != nil {
			return nil, fmt.Errorf("ListByTeam scan: %w", err)
		}
		matches = append(matches, m)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("ListByTeam rows: %w", err)
	}
	return matches, nil
}

func (r *bracketRepo) UpdateStatus(ctx context.Context, id uuid.UUID, status string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE bracket_matches SET status = $2 WHERE id = $1`, id, status)
	if err != nil {
		return fmt.Errorf("UpdateStatus: %w", err)
	}
	return nil
}

func (r *bracketRepo) UpdateResult(ctx context.Context, id uuid.UUID, winnerID, loserID uuid.UUID, scoreA, scoreB int) error {
	_, err := r.db.Exec(ctx,
		`UPDATE bracket_matches
		 SET winner_id = $2, loser_id = $3, score_a = $4, score_b = $5,
		     status = 'completed', completed_at = NOW()
		 WHERE id = $1`,
		id, winnerID, loserID, scoreA, scoreB)
	if err != nil {
		return fmt.Errorf("UpdateResult: %w", err)
	}
	return nil
}

func (r *bracketRepo) UpdateBestOf(ctx context.Context, id uuid.UUID, bestOf int) error {
	_, err := r.db.Exec(ctx, `UPDATE bracket_matches SET best_of = $2 WHERE id = $1`, id, bestOf)
	if err != nil {
		return fmt.Errorf("UpdateBestOf: %w", err)
	}
	return nil
}

func (r *bracketRepo) UpdateBestOfByTournamentAndRound(ctx context.Context, tournamentID uuid.UUID, round int, bestOf int) (int64, error) {
	ct, err := r.db.Exec(ctx,
		`UPDATE bracket_matches SET best_of = $3 WHERE tournament_id = $1 AND round = $2`,
		tournamentID, round, bestOf)
	if err != nil {
		return 0, fmt.Errorf("UpdateBestOfByTournamentAndRound: %w", err)
	}
	return ct.RowsAffected(), nil
}

func (r *bracketRepo) FindLiveAcrossAllTournaments(ctx context.Context, limit int) ([]*model.BracketMatch, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, tournament_id, round, match_number, bracket_position,
		        team_a_id, team_b_id, winner_id, loser_id, score_a, score_b,
		        status, scheduled_at, started_at, completed_at,
		        next_match_id, loser_next_match_id, stream_url, notes,
		        COALESCE(best_of, 1)
		 FROM bracket_matches
		 WHERE status = 'live'
		 ORDER BY updated_at DESC
		 LIMIT $1`, limit)
	if err != nil {
		return nil, fmt.Errorf("FindLiveAcrossAllTournaments: %w", err)
	}
	defer rows.Close()

	var matches []*model.BracketMatch
	for rows.Next() {
		m := &model.BracketMatch{}
		if err := rows.Scan(&m.ID, &m.TournamentID, &m.Round, &m.MatchNumber, &m.BracketPosition,
			&m.TeamAID, &m.TeamBID, &m.WinnerID, &m.LoserID, &m.ScoreA, &m.ScoreB,
			&m.Status, &m.ScheduledAt, &m.StartedAt, &m.CompletedAt,
			&m.NextMatchID, &m.LoserNextMatchID, &m.StreamURL, &m.Notes, &m.BestOf); err != nil {
			return nil, fmt.Errorf("FindLiveAcrossAllTournaments scan: %w", err)
		}
		matches = append(matches, m)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("FindLiveAcrossAllTournaments rows: %w", err)
	}
	return matches, nil
}

func (r *bracketRepo) FindScheduledAcrossAllTournaments(ctx context.Context, limit int) ([]*model.BracketMatch, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, tournament_id, round, match_number, bracket_position,
		        team_a_id, team_b_id, winner_id, loser_id, score_a, score_b,
		        status, scheduled_at, started_at, completed_at,
		        next_match_id, loser_next_match_id, stream_url, notes,
		        COALESCE(best_of, 1)
		 FROM bracket_matches
		 WHERE status = 'scheduled' AND team_a_id IS NOT NULL AND team_b_id IS NOT NULL
		 ORDER BY scheduled_at ASC NULLS LAST, updated_at DESC
		 LIMIT $1`, limit)
	if err != nil {
		return nil, fmt.Errorf("FindScheduledAcrossAllTournaments: %w", err)
	}
	defer rows.Close()

	var matches []*model.BracketMatch
	for rows.Next() {
		m := &model.BracketMatch{}
		if err := rows.Scan(&m.ID, &m.TournamentID, &m.Round, &m.MatchNumber, &m.BracketPosition,
			&m.TeamAID, &m.TeamBID, &m.WinnerID, &m.LoserID, &m.ScoreA, &m.ScoreB,
			&m.Status, &m.ScheduledAt, &m.StartedAt, &m.CompletedAt,
			&m.NextMatchID, &m.LoserNextMatchID, &m.StreamURL, &m.Notes, &m.BestOf); err != nil {
			return nil, fmt.Errorf("FindScheduledAcrossAllTournaments scan: %w", err)
		}
		matches = append(matches, m)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("FindScheduledAcrossAllTournaments rows: %w", err)
	}
	return matches, nil
}

func (r *bracketRepo) FindRecentCompleted(ctx context.Context, limit int) ([]*model.BracketMatch, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, tournament_id, round, match_number, bracket_position,
		        team_a_id, team_b_id, winner_id, loser_id, score_a, score_b,
		        status, scheduled_at, started_at, completed_at,
		        next_match_id, loser_next_match_id, stream_url, notes,
		        COALESCE(best_of, 1)
		 FROM bracket_matches
		 WHERE status = 'completed' AND winner_id IS NOT NULL
		 ORDER BY completed_at DESC
		 LIMIT $1`, limit)
	if err != nil {
		return nil, fmt.Errorf("FindRecentCompleted: %w", err)
	}
	defer rows.Close()

	var matches []*model.BracketMatch
	for rows.Next() {
		m := &model.BracketMatch{}
		if err := rows.Scan(&m.ID, &m.TournamentID, &m.Round, &m.MatchNumber, &m.BracketPosition,
			&m.TeamAID, &m.TeamBID, &m.WinnerID, &m.LoserID, &m.ScoreA, &m.ScoreB,
			&m.Status, &m.ScheduledAt, &m.StartedAt, &m.CompletedAt,
			&m.NextMatchID, &m.LoserNextMatchID, &m.StreamURL, &m.Notes, &m.BestOf); err != nil {
			return nil, fmt.Errorf("FindRecentCompleted scan: %w", err)
		}
		matches = append(matches, m)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("FindRecentCompleted rows: %w", err)
	}
	return matches, nil
}

// ResetResultsByTournament resets all bracket match results for a tournament while preserving
// the bracket structure and round-1 WB seeding. Also clears related submissions and match games.
func (r *bracketRepo) ResetResultsByTournament(ctx context.Context, tournamentID uuid.UUID) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("ResetResultsByTournament begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	// 1. Delete match_submissions for all matches in this tournament
	if _, err := tx.Exec(ctx,
		`DELETE FROM match_submissions
		 WHERE bracket_match_id IN (
		   SELECT id FROM bracket_matches WHERE tournament_id = $1
		 )`, tournamentID); err != nil {
		return fmt.Errorf("ResetResultsByTournament delete submissions: %w", err)
	}

	// 2. Delete match_games for all matches in this tournament
	if _, err := tx.Exec(ctx,
		`DELETE FROM match_games
		 WHERE bracket_match_id IN (
		   SELECT id FROM bracket_matches WHERE tournament_id = $1
		 )`, tournamentID); err != nil {
		return fmt.Errorf("ResetResultsByTournament delete match_games: %w", err)
	}

	// 3. For round > 1 and all LB/GF matches: clear team slots AND results.
	//    Skip 'bye' matches (they are structural and re-advanced by service).
	if _, err := tx.Exec(ctx,
		`UPDATE bracket_matches SET
		   team_a_id = NULL, team_b_id = NULL,
		   winner_id = NULL, loser_id = NULL,
		   score_a = NULL, score_b = NULL,
		   status = 'pending',
		   completed_at = NULL, started_at = NULL,
		   updated_at = NOW()
		 WHERE tournament_id = $1
		   AND status != 'bye'
		   AND (round > 1 OR bracket_position IN ('losers', 'grand_final'))`,
		tournamentID); err != nil {
		return fmt.Errorf("ResetResultsByTournament clear advanced matches: %w", err)
	}

	// 4. For round-1 WB matches: clear results only, preserve team seeding.
	//    Restore status to 'scheduled' if both teams present, else 'pending'.
	if _, err := tx.Exec(ctx,
		`UPDATE bracket_matches SET
		   winner_id = NULL, loser_id = NULL,
		   score_a = NULL, score_b = NULL,
		   status = CASE
		     WHEN team_a_id IS NOT NULL AND team_b_id IS NOT NULL THEN 'scheduled'
		     ELSE 'pending'
		   END,
		   completed_at = NULL, started_at = NULL,
		   updated_at = NOW()
		 WHERE tournament_id = $1
		   AND status != 'bye'
		   AND round = 1
		   AND (bracket_position = 'winners' OR bracket_position IS NULL)`,
		tournamentID); err != nil {
		return fmt.Errorf("ResetResultsByTournament clear r1 results: %w", err)
	}

	// 5. Reset standings: zero out all match-derived stats.
	if _, err := tx.Exec(ctx,
		`UPDATE standings SET
		   wins = 0, losses = 0, matches_played = 0,
		   rounds_won = 0, rounds_lost = 0,
		   is_eliminated = false
		 WHERE tournament_id = $1`,
		tournamentID); err != nil {
		return fmt.Errorf("ResetResultsByTournament reset standings: %w", err)
	}

	return tx.Commit(ctx)
}

func (r *bracketRepo) ListScheduledBefore(ctx context.Context, before time.Time) ([]*model.BracketMatch, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, tournament_id, round, match_number, bracket_position,
		        team_a_id, team_b_id, winner_id, loser_id, score_a, score_b,
		        status, scheduled_at, started_at, completed_at,
		        next_match_id, loser_next_match_id, stream_url, notes,
		        COALESCE(best_of, 1)
		 FROM bracket_matches
		 WHERE status = 'scheduled' AND scheduled_at IS NOT NULL AND scheduled_at <= $1
		 ORDER BY scheduled_at ASC`, before)
	if err != nil {
		return nil, fmt.Errorf("ListScheduledBefore: %w", err)
	}
	defer rows.Close()

	var matches []*model.BracketMatch
	for rows.Next() {
		m := &model.BracketMatch{}
		if err := rows.Scan(&m.ID, &m.TournamentID, &m.Round, &m.MatchNumber, &m.BracketPosition,
			&m.TeamAID, &m.TeamBID, &m.WinnerID, &m.LoserID, &m.ScoreA, &m.ScoreB,
			&m.Status, &m.ScheduledAt, &m.StartedAt, &m.CompletedAt,
			&m.NextMatchID, &m.LoserNextMatchID, &m.StreamURL, &m.Notes, &m.BestOf); err != nil {
			return nil, fmt.Errorf("ListScheduledBefore scan: %w", err)
		}
		matches = append(matches, m)
	}
	return matches, nil
}
