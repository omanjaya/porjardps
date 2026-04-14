package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/porjar-denpasar/porjar-api/internal/model"
)

type groupRepo struct {
	db *pgxpool.Pool
}

func NewGroupRepo(db *pgxpool.Pool) model.GroupRepository {
	return &groupRepo{db: db}
}

// ── Groups ──

func (r *groupRepo) CreateGroup(ctx context.Context, g *model.TournamentGroup) error {
	if g.Legs <= 0 {
		g.Legs = 1
	}
	if g.PairingMode == "" {
		g.PairingMode = "round_robin"
	}
	var swissJSON []byte
	if g.SwissConfig != nil {
		swissJSON, _ = json.Marshal(g.SwissConfig)
	}
	return r.db.QueryRow(ctx,
		`INSERT INTO tournament_groups (tournament_id, name, group_order, advance_count, legs, pairing_mode, swiss_config, stage_id)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		 RETURNING id, created_at`,
		g.TournamentID, g.Name, g.GroupOrder, g.AdvanceCount, g.Legs, g.PairingMode, swissJSON, g.StageID,
	).Scan(&g.ID, &g.CreatedAt)
}

func (r *groupRepo) FindGroupByID(ctx context.Context, id uuid.UUID) (*model.TournamentGroup, error) {
	g := &model.TournamentGroup{}
	var swissConfigBytes []byte
	err := r.db.QueryRow(ctx,
		`SELECT id, tournament_id, name, group_order, advance_count, legs, pairing_mode, swiss_config, stage_id, created_at
		 FROM tournament_groups WHERE id = $1`, id,
	).Scan(&g.ID, &g.TournamentID, &g.Name, &g.GroupOrder, &g.AdvanceCount, &g.Legs, &g.PairingMode, &swissConfigBytes, &g.StageID, &g.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("FindGroupByID: %w", err)
	}
	if swissConfigBytes != nil {
		var sc model.SwissConfig
		if err := json.Unmarshal(swissConfigBytes, &sc); err == nil {
			g.SwissConfig = &sc
		}
	}
	return g, nil
}

func (r *groupRepo) FindGroupsByTournament(ctx context.Context, tournamentID uuid.UUID) ([]*model.TournamentGroup, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, tournament_id, name, group_order, advance_count, legs, pairing_mode, swiss_config, stage_id, created_at
		 FROM tournament_groups WHERE tournament_id = $1
		 ORDER BY group_order`, tournamentID,
	)
	if err != nil {
		return nil, fmt.Errorf("FindGroupsByTournament: %w", err)
	}
	defer rows.Close()

	var groups []*model.TournamentGroup
	for rows.Next() {
		g := &model.TournamentGroup{}
		var swissConfigBytes []byte
		if err := rows.Scan(&g.ID, &g.TournamentID, &g.Name, &g.GroupOrder, &g.AdvanceCount, &g.Legs, &g.PairingMode, &swissConfigBytes, &g.StageID, &g.CreatedAt); err != nil {
			return nil, fmt.Errorf("FindGroupsByTournament scan: %w", err)
		}
		if swissConfigBytes != nil {
			var sc model.SwissConfig
			if err := json.Unmarshal(swissConfigBytes, &sc); err == nil {
				g.SwissConfig = &sc
			}
		}
		groups = append(groups, g)
	}
	return groups, rows.Err()
}

func (r *groupRepo) UpdateGroup(ctx context.Context, id uuid.UUID, name string, advanceCount int) error {
	_, err := r.db.Exec(ctx,
		`UPDATE tournament_groups SET name = $1, advance_count = $2 WHERE id = $3`,
		name, advanceCount, id,
	)
	return err
}

func (r *groupRepo) DeleteGroup(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.Exec(ctx, `DELETE FROM tournament_groups WHERE id = $1`, id)
	return err
}

// ── Group Teams ──

func (r *groupRepo) AddTeamToGroup(ctx context.Context, groupID, teamID uuid.UUID) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO group_teams (group_id, team_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
		groupID, teamID,
	)
	return err
}

func (r *groupRepo) RemoveTeamFromGroup(ctx context.Context, groupID, teamID uuid.UUID) error {
	_, err := r.db.Exec(ctx,
		`DELETE FROM group_teams WHERE group_id = $1 AND team_id = $2`,
		groupID, teamID,
	)
	return err
}

func (r *groupRepo) FindTeamsByGroup(ctx context.Context, groupID uuid.UUID) ([]uuid.UUID, error) {
	rows, err := r.db.Query(ctx,
		`SELECT team_id FROM group_teams WHERE group_id = $1`, groupID,
	)
	if err != nil {
		return nil, fmt.Errorf("FindTeamsByGroup: %w", err)
	}
	defer rows.Close()

	var ids []uuid.UUID
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err != nil {
			return nil, fmt.Errorf("FindTeamsByGroup scan: %w", err)
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}

// ── Group Matches ──

func (r *groupRepo) CreateMatch(ctx context.Context, m *model.GroupMatch) error {
	return r.db.QueryRow(ctx,
		`INSERT INTO group_matches (group_id, round, match_number, team_a_id, team_b_id, status, score_a, score_b)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		 RETURNING id, created_at`,
		m.GroupID, m.Round, m.MatchNumber, m.TeamAID, m.TeamBID, m.Status, m.ScoreA, m.ScoreB,
	).Scan(&m.ID, &m.CreatedAt)
}

func (r *groupRepo) FindMatchesByGroup(ctx context.Context, groupID uuid.UUID) ([]*model.GroupMatch, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, group_id, round, match_number, team_a_id, team_b_id,
		        score_a, score_b, status, scheduled_at, completed_at, created_at
		 FROM group_matches WHERE group_id = $1
		 ORDER BY round, match_number`, groupID,
	)
	if err != nil {
		return nil, fmt.Errorf("FindMatchesByGroup: %w", err)
	}
	defer rows.Close()

	var matches []*model.GroupMatch
	for rows.Next() {
		m := &model.GroupMatch{}
		if err := rows.Scan(&m.ID, &m.GroupID, &m.Round, &m.MatchNumber,
			&m.TeamAID, &m.TeamBID, &m.ScoreA, &m.ScoreB, &m.Status,
			&m.ScheduledAt, &m.CompletedAt, &m.CreatedAt); err != nil {
			return nil, fmt.Errorf("FindMatchesByGroup scan: %w", err)
		}
		matches = append(matches, m)
	}
	return matches, rows.Err()
}

func (r *groupRepo) FindMatchByID(ctx context.Context, id uuid.UUID) (*model.GroupMatch, error) {
	m := &model.GroupMatch{}
	err := r.db.QueryRow(ctx,
		`SELECT id, group_id, round, match_number, team_a_id, team_b_id,
		        score_a, score_b, status, scheduled_at, completed_at, created_at
		 FROM group_matches WHERE id = $1`, id,
	).Scan(&m.ID, &m.GroupID, &m.Round, &m.MatchNumber,
		&m.TeamAID, &m.TeamBID, &m.ScoreA, &m.ScoreB, &m.Status,
		&m.ScheduledAt, &m.CompletedAt, &m.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("FindMatchByID: %w", err)
	}
	return m, nil
}

func (r *groupRepo) FindMatchByIDs(ctx context.Context, ids []uuid.UUID) ([]*model.GroupMatch, error) {
	if len(ids) == 0 {
		return nil, nil
	}
	rows, err := r.db.Query(ctx,
		`SELECT id, group_id, round, match_number, team_a_id, team_b_id,
		        score_a, score_b, status, scheduled_at, completed_at, created_at
		 FROM group_matches WHERE id = ANY($1)`, ids,
	)
	if err != nil {
		return nil, fmt.Errorf("FindMatchByIDs: %w", err)
	}
	defer rows.Close()

	var matches []*model.GroupMatch
	for rows.Next() {
		m := &model.GroupMatch{}
		if err := rows.Scan(&m.ID, &m.GroupID, &m.Round, &m.MatchNumber,
			&m.TeamAID, &m.TeamBID, &m.ScoreA, &m.ScoreB, &m.Status,
			&m.ScheduledAt, &m.CompletedAt, &m.CreatedAt); err != nil {
			return nil, fmt.Errorf("FindMatchByIDs scan: %w", err)
		}
		matches = append(matches, m)
	}
	return matches, rows.Err()
}

func (r *groupRepo) UpdateMatchScore(ctx context.Context, id uuid.UUID, scoreA, scoreB int, scheduledAt *time.Time) error {
	_, err := r.db.Exec(ctx,
		`UPDATE group_matches
		 SET score_a = $2, score_b = $3, status = 'completed', completed_at = NOW(),
		     scheduled_at = COALESCE($4, scheduled_at)
		 WHERE id = $1`,
		id, scoreA, scoreB, scheduledAt,
	)
	return err
}

func (r *groupRepo) MarkMatchCompleted(ctx context.Context, id uuid.UUID) error {
	now := time.Now()
	_, err := r.db.Exec(ctx,
		`UPDATE group_matches SET status = 'completed', completed_at = $2 WHERE id = $1`,
		id, now,
	)
	return err
}

func (r *groupRepo) DeleteMatchesByGroup(ctx context.Context, groupID uuid.UUID) error {
	_, err := r.db.Exec(ctx, `DELETE FROM group_matches WHERE group_id = $1`, groupID)
	return err
}

func (r *groupRepo) ResetMatchResultsByGroup(ctx context.Context, groupID uuid.UUID) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("ResetMatchResultsByGroup begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	// 1. Delete match_submissions for all group matches in this group
	if _, err := tx.Exec(ctx,
		`DELETE FROM match_submissions
		 WHERE group_match_id IN (
		   SELECT id FROM group_matches WHERE group_id = $1
		 )`, groupID); err != nil {
		return fmt.Errorf("ResetMatchResultsByGroup delete submissions: %w", err)
	}

	// 2. Reset all match scores and statuses
	if _, err := tx.Exec(ctx,
		`UPDATE group_matches SET
		   score_a = 0, score_b = 0,
		   status = 'scheduled',
		   completed_at = NULL
		 WHERE group_id = $1`, groupID); err != nil {
		return fmt.Errorf("ResetMatchResultsByGroup reset matches: %w", err)
	}

	// 3. Reset standings (preserve penalty_points)
	if _, err := tx.Exec(ctx,
		`UPDATE group_standings SET
		    matches_played = 0, wins = 0, draws = 0, losses = 0,
		    goals_for = 0, goals_against = 0, goal_difference = 0,
		    points = 0, rank_position = 0
		 WHERE group_id = $1`, groupID); err != nil {
		return fmt.Errorf("ResetMatchResultsByGroup reset standings: %w", err)
	}

	return tx.Commit(ctx)
}

func (r *groupRepo) UpdateMatchStatus(ctx context.Context, id uuid.UUID, status string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE group_matches SET status = $2 WHERE id = $1`,
		id, status,
	)
	return err
}

func (r *groupRepo) FindLiveMatches(ctx context.Context, limit int) ([]*model.GroupMatch, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, group_id, round, match_number, team_a_id, team_b_id,
		        score_a, score_b, status, scheduled_at, completed_at, created_at
		 FROM group_matches WHERE status = 'live'
		 ORDER BY created_at DESC
		 LIMIT $1`, limit)
	if err != nil {
		return nil, fmt.Errorf("FindLiveMatches: %w", err)
	}
	defer rows.Close()

	var matches []*model.GroupMatch
	for rows.Next() {
		m := &model.GroupMatch{}
		if err := rows.Scan(&m.ID, &m.GroupID, &m.Round, &m.MatchNumber,
			&m.TeamAID, &m.TeamBID, &m.ScoreA, &m.ScoreB, &m.Status,
			&m.ScheduledAt, &m.CompletedAt, &m.CreatedAt); err != nil {
			return nil, fmt.Errorf("FindLiveMatches scan: %w", err)
		}
		matches = append(matches, m)
	}
	return matches, rows.Err()
}

func (r *groupRepo) FindLiveMatchesByTeam(ctx context.Context, teamID uuid.UUID) ([]*model.GroupMatch, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, group_id, round, match_number, team_a_id, team_b_id,
		        score_a, score_b, status, scheduled_at, completed_at, created_at
		 FROM group_matches WHERE status = 'live' AND (team_a_id = $1 OR team_b_id = $1)
		 ORDER BY round, match_number`, teamID)
	if err != nil {
		return nil, fmt.Errorf("FindLiveMatchesByTeam: %w", err)
	}
	defer rows.Close()

	var matches []*model.GroupMatch
	for rows.Next() {
		m := &model.GroupMatch{}
		if err := rows.Scan(&m.ID, &m.GroupID, &m.Round, &m.MatchNumber,
			&m.TeamAID, &m.TeamBID, &m.ScoreA, &m.ScoreB, &m.Status,
			&m.ScheduledAt, &m.CompletedAt, &m.CreatedAt); err != nil {
			return nil, fmt.Errorf("FindLiveMatchesByTeam scan: %w", err)
		}
		matches = append(matches, m)
	}
	return matches, rows.Err()
}

// ── Standings ──

func (r *groupRepo) UpsertStanding(ctx context.Context, s *model.GroupStanding) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO group_standings (group_id, team_id, matches_played, wins, draws, losses,
		                              goals_for, goals_against, goal_difference, points, penalty_points, rank_position)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		 ON CONFLICT (group_id, team_id)
		 DO UPDATE SET matches_played = $3, wins = $4, draws = $5, losses = $6,
		              goals_for = $7, goals_against = $8, goal_difference = $9,
		              points = $10, penalty_points = $11, rank_position = $12`,
		s.GroupID, s.TeamID, s.MatchesPlayed, s.Wins, s.Draws, s.Losses,
		s.GoalsFor, s.GoalsAgainst, s.GoalDifference, s.Points, s.PenaltyPoints, s.RankPosition,
	)
	return err
}

func (r *groupRepo) FindStandingsByGroup(ctx context.Context, groupID uuid.UUID) ([]*model.GroupStanding, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, group_id, team_id, matches_played, wins, draws, losses,
		        goals_for, goals_against, goal_difference, points, penalty_points, rank_position
		 FROM group_standings WHERE group_id = $1
		 ORDER BY rank_position`, groupID,
	)
	if err != nil {
		return nil, fmt.Errorf("FindStandingsByGroup: %w", err)
	}
	defer rows.Close()

	var standings []*model.GroupStanding
	for rows.Next() {
		s := &model.GroupStanding{}
		if err := rows.Scan(&s.ID, &s.GroupID, &s.TeamID, &s.MatchesPlayed,
			&s.Wins, &s.Draws, &s.Losses, &s.GoalsFor, &s.GoalsAgainst,
			&s.GoalDifference, &s.Points, &s.PenaltyPoints, &s.RankPosition); err != nil {
			return nil, fmt.Errorf("FindStandingsByGroup scan: %w", err)
		}
		standings = append(standings, s)
	}
	return standings, rows.Err()
}

func (r *groupRepo) DeleteStandingsByGroup(ctx context.Context, groupID uuid.UUID) error {
	_, err := r.db.Exec(ctx, `DELETE FROM group_standings WHERE group_id = $1`, groupID)
	return err
}

func (r *groupRepo) UpdatePenaltyPoints(ctx context.Context, groupID, teamID uuid.UUID, penaltyPoints int) error {
	_, err := r.db.Exec(ctx,
		`UPDATE group_standings SET penalty_points = $3 WHERE group_id = $1 AND team_id = $2`,
		groupID, teamID, penaltyPoints)
	return err
}

func (r *groupRepo) UpdateSwissConfig(ctx context.Context, groupID uuid.UUID, config *model.SwissConfig) error {
	configJSON, _ := json.Marshal(config)
	_, err := r.db.Exec(ctx,
		`UPDATE tournament_groups SET swiss_config = $2 WHERE id = $1`,
		groupID, configJSON)
	return err
}
