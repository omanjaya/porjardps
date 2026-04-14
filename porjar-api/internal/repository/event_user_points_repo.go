package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/porjar-denpasar/porjar-api/internal/model"
)

type eventUserPointsRepo struct {
	db *pgxpool.Pool
}

func NewEventUserPointsRepo(db *pgxpool.Pool) model.EventUserPointsRepository {
	return &eventUserPointsRepo{db: db}
}

func (r *eventUserPointsRepo) BulkCreate(ctx context.Context, points []*model.EventUserPoints) error {
	if len(points) == 0 {
		return nil
	}
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("BulkCreate begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	for _, p := range points {
		if _, err := tx.Exec(ctx,
			`INSERT INTO event_user_points (id, event_id, tournament_id, user_id, team_id, rank_position, points, awarded_at)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
			p.ID, p.EventID, p.TournamentID, p.UserID, p.TeamID, p.RankPosition, p.Points, p.AwardedAt); err != nil {
			return fmt.Errorf("BulkCreate insert: %w", err)
		}
	}

	return tx.Commit(ctx)
}

func (r *eventUserPointsRepo) DeleteByTournament(ctx context.Context, tournamentID uuid.UUID) error {
	_, err := r.db.Exec(ctx,
		`DELETE FROM event_user_points WHERE tournament_id = $1`, tournamentID)
	if err != nil {
		return fmt.Errorf("DeleteByTournament: %w", err)
	}
	return nil
}

func (r *eventUserPointsRepo) UserLeaderboard(ctx context.Context, eventID uuid.UUID, limit, offset int) ([]*model.UserLeaderboardEntry, int, error) {
	var total int
	if err := r.db.QueryRow(ctx,
		`SELECT COUNT(DISTINCT user_id) FROM event_user_points WHERE event_id = $1`,
		eventID).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("UserLeaderboard count: %w", err)
	}

	rows, err := r.db.Query(ctx,
		`SELECT u.id, u.full_name, u.avatar_url, SUM(eup.points) AS total_points
		 FROM event_user_points eup
		 JOIN users u ON u.id = eup.user_id
		 WHERE eup.event_id = $1
		 GROUP BY u.id, u.full_name, u.avatar_url
		 ORDER BY total_points DESC
		 LIMIT $2 OFFSET $3`,
		eventID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("UserLeaderboard: %w", err)
	}
	defer rows.Close()

	var entries []*model.UserLeaderboardEntry
	rank := offset + 1
	for rows.Next() {
		e := &model.UserLeaderboardEntry{}
		if err := rows.Scan(&e.UserID, &e.FullName, &e.AvatarURL, &e.TotalPoints); err != nil {
			return nil, 0, fmt.Errorf("UserLeaderboard scan: %w", err)
		}
		e.Rank = rank
		rank++
		entries = append(entries, e)
	}
	return entries, total, rows.Err()
}

func (r *eventUserPointsRepo) UserLeaderboardGlobal(ctx context.Context, limit, offset int) ([]*model.UserLeaderboardEntry, int, error) {
	var total int
	if err := r.db.QueryRow(ctx,
		`SELECT COUNT(DISTINCT user_id) FROM event_user_points`).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("UserLeaderboardGlobal count: %w", err)
	}

	rows, err := r.db.Query(ctx,
		`SELECT u.id, u.full_name, u.avatar_url, SUM(eup.points) AS total_points
		 FROM event_user_points eup
		 JOIN users u ON u.id = eup.user_id
		 GROUP BY u.id, u.full_name, u.avatar_url
		 ORDER BY total_points DESC
		 LIMIT $1 OFFSET $2`,
		limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("UserLeaderboardGlobal: %w", err)
	}
	defer rows.Close()

	var entries []*model.UserLeaderboardEntry
	rank := offset + 1
	for rows.Next() {
		e := &model.UserLeaderboardEntry{}
		if err := rows.Scan(&e.UserID, &e.FullName, &e.AvatarURL, &e.TotalPoints); err != nil {
			return nil, 0, fmt.Errorf("UserLeaderboardGlobal scan: %w", err)
		}
		e.Rank = rank
		rank++
		entries = append(entries, e)
	}
	return entries, total, rows.Err()
}

func (r *eventUserPointsRepo) ListByUser(ctx context.Context, userID uuid.UUID) ([]*model.EventUserPoints, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, event_id, tournament_id, user_id, team_id, rank_position, points, awarded_at
		 FROM event_user_points WHERE user_id = $1
		 ORDER BY awarded_at DESC`, userID)
	if err != nil {
		return nil, fmt.Errorf("ListByUser: %w", err)
	}
	defer rows.Close()

	var results []*model.EventUserPoints
	for rows.Next() {
		p := &model.EventUserPoints{}
		if err := rows.Scan(&p.ID, &p.EventID, &p.TournamentID, &p.UserID, &p.TeamID, &p.RankPosition, &p.Points, &p.AwardedAt); err != nil {
			return nil, fmt.Errorf("ListByUser scan: %w", err)
		}
		results = append(results, p)
	}
	return results, rows.Err()
}

func (r *eventUserPointsRepo) ListByUserEnriched(ctx context.Context, userID uuid.UUID) ([]*model.EnrichedUserPoints, error) {
	rows, err := r.db.Query(ctx,
		`SELECT eup.id, eup.event_id, e.name, eup.tournament_id, t.name,
		        eup.team_id, tm.name, eup.rank_position, eup.points, eup.awarded_at
		 FROM event_user_points eup
		 JOIN events e ON e.id = eup.event_id
		 JOIN tournaments t ON t.id = eup.tournament_id
		 JOIN teams tm ON tm.id = eup.team_id
		 WHERE eup.user_id = $1
		 ORDER BY eup.awarded_at DESC`, userID)
	if err != nil {
		return nil, fmt.Errorf("ListByUserEnriched: %w", err)
	}
	defer rows.Close()

	var results []*model.EnrichedUserPoints
	for rows.Next() {
		p := &model.EnrichedUserPoints{}
		if err := rows.Scan(
			&p.ID, &p.EventID, &p.EventName, &p.TournamentID, &p.TournamentName,
			&p.TeamID, &p.TeamName, &p.RankPosition, &p.Points, &p.AwardedAt,
		); err != nil {
			return nil, fmt.Errorf("ListByUserEnriched scan: %w", err)
		}
		results = append(results, p)
	}
	return results, rows.Err()
}
