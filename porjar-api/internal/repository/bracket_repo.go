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
	_, err := r.db.Exec(ctx,
		`INSERT INTO bracket_matches (id, tournament_id, round, match_number, bracket_position,
		        team_a_id, team_b_id, winner_id, loser_id, score_a, score_b,
		        status, scheduled_at, started_at, completed_at,
		        next_match_id, loser_next_match_id, stream_url, notes)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
		m.ID, m.TournamentID, m.Round, m.MatchNumber, m.BracketPosition,
		m.TeamAID, m.TeamBID, m.WinnerID, m.LoserID, m.ScoreA, m.ScoreB,
		m.Status, m.ScheduledAt, m.StartedAt, m.CompletedAt,
		m.NextMatchID, m.LoserNextMatchID, m.StreamURL, m.Notes)
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
		 ORDER BY round ASC, match_number ASC`, tournamentID)
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
