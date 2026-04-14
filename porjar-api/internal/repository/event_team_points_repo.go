package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/porjar-denpasar/porjar-api/internal/model"
)

type eventTeamPointsRepo struct {
	db *pgxpool.Pool
}

func NewEventTeamPointsRepo(db *pgxpool.Pool) model.EventTeamPointsRepository {
	return &eventTeamPointsRepo{db: db}
}

func (r *eventTeamPointsRepo) Create(ctx context.Context, p *model.EventTeamPoints) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO event_team_points (id, event_id, tournament_id, team_id, rank_position, points, awarded_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		p.ID, p.EventID, p.TournamentID, p.TeamID, p.RankPosition, p.Points, p.AwardedAt)
	if err != nil {
		return fmt.Errorf("Create: %w", err)
	}
	return nil
}

func (r *eventTeamPointsRepo) BulkCreate(ctx context.Context, points []*model.EventTeamPoints) error {
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
			`INSERT INTO event_team_points (id, event_id, tournament_id, team_id, rank_position, points, awarded_at)
			 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
			p.ID, p.EventID, p.TournamentID, p.TeamID, p.RankPosition, p.Points, p.AwardedAt); err != nil {
			return fmt.Errorf("BulkCreate insert: %w", err)
		}
	}

	return tx.Commit(ctx)
}

func (r *eventTeamPointsRepo) DeleteByTournament(ctx context.Context, tournamentID uuid.UUID) error {
	_, err := r.db.Exec(ctx,
		`DELETE FROM event_team_points WHERE tournament_id = $1`, tournamentID)
	if err != nil {
		return fmt.Errorf("DeleteByTournament: %w", err)
	}
	return nil
}

func (r *eventTeamPointsRepo) ListByEvent(ctx context.Context, eventID uuid.UUID) ([]*model.EventTeamPoints, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, event_id, tournament_id, team_id, rank_position, points, awarded_at
		 FROM event_team_points WHERE event_id = $1
		 ORDER BY points DESC`, eventID)
	if err != nil {
		return nil, fmt.Errorf("ListByEvent: %w", err)
	}
	defer rows.Close()

	var results []*model.EventTeamPoints
	for rows.Next() {
		p := &model.EventTeamPoints{}
		if err := rows.Scan(&p.ID, &p.EventID, &p.TournamentID, &p.TeamID, &p.RankPosition, &p.Points, &p.AwardedAt); err != nil {
			return nil, fmt.Errorf("ListByEvent scan: %w", err)
		}
		results = append(results, p)
	}
	return results, rows.Err()
}

func (r *eventTeamPointsRepo) TeamLeaderboard(ctx context.Context, eventID uuid.UUID, limit, offset int) ([]*model.TeamLeaderboardEntry, int, error) {
	var total int
	if err := r.db.QueryRow(ctx,
		`SELECT COUNT(DISTINCT etp.team_id) FROM event_team_points etp WHERE etp.event_id = $1`,
		eventID).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("TeamLeaderboard count: %w", err)
	}

	rows, err := r.db.Query(ctx,
		`SELECT t.id, t.name, t.logo_url, s.name AS school_name, SUM(etp.points) AS total_points
		 FROM event_team_points etp
		 JOIN teams t ON t.id = etp.team_id
		 LEFT JOIN schools s ON s.id = t.school_id
		 WHERE etp.event_id = $1
		 GROUP BY t.id, t.name, t.logo_url, s.name
		 ORDER BY total_points DESC
		 LIMIT $2 OFFSET $3`,
		eventID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("TeamLeaderboard: %w", err)
	}
	defer rows.Close()

	var entries []*model.TeamLeaderboardEntry
	rank := offset + 1
	for rows.Next() {
		e := &model.TeamLeaderboardEntry{}
		if err := rows.Scan(&e.TeamID, &e.TeamName, &e.TeamLogoURL, &e.SchoolName, &e.TotalPoints); err != nil {
			return nil, 0, fmt.Errorf("TeamLeaderboard scan: %w", err)
		}
		e.Rank = rank
		rank++
		entries = append(entries, e)
	}
	return entries, total, rows.Err()
}

func (r *eventTeamPointsRepo) TeamLeaderboardGlobal(ctx context.Context, limit, offset int) ([]*model.TeamLeaderboardEntry, int, error) {
	var total int
	if err := r.db.QueryRow(ctx,
		`SELECT COUNT(DISTINCT team_id) FROM event_team_points`).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("TeamLeaderboardGlobal count: %w", err)
	}

	rows, err := r.db.Query(ctx,
		`SELECT t.id, t.name, t.logo_url, s.name AS school_name, SUM(etp.points) AS total_points
		 FROM event_team_points etp
		 JOIN teams t ON t.id = etp.team_id
		 LEFT JOIN schools s ON s.id = t.school_id
		 GROUP BY t.id, t.name, t.logo_url, s.name
		 ORDER BY total_points DESC
		 LIMIT $1 OFFSET $2`,
		limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("TeamLeaderboardGlobal: %w", err)
	}
	defer rows.Close()

	var entries []*model.TeamLeaderboardEntry
	rank := offset + 1
	for rows.Next() {
		e := &model.TeamLeaderboardEntry{}
		if err := rows.Scan(&e.TeamID, &e.TeamName, &e.TeamLogoURL, &e.SchoolName, &e.TotalPoints); err != nil {
			return nil, 0, fmt.Errorf("TeamLeaderboardGlobal scan: %w", err)
		}
		e.Rank = rank
		rank++
		entries = append(entries, e)
	}
	return entries, total, rows.Err()
}

func (r *eventTeamPointsRepo) SchoolLeaderboard(ctx context.Context, eventID uuid.UUID, limit, offset int) ([]*model.SchoolLeaderboardEntry, int, error) {
	var total int
	if err := r.db.QueryRow(ctx,
		`SELECT COUNT(DISTINCT t.school_id)
		 FROM event_team_points etp
		 JOIN teams t ON t.id = etp.team_id
		 WHERE etp.event_id = $1 AND t.school_id IS NOT NULL`,
		eventID).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("SchoolLeaderboard count: %w", err)
	}

	rows, err := r.db.Query(ctx,
		`SELECT s.id, s.name, s.logo_url, SUM(etp.points) AS total_points, COUNT(DISTINCT t.id) AS team_count
		 FROM event_team_points etp
		 JOIN teams t ON t.id = etp.team_id
		 JOIN schools s ON s.id = t.school_id
		 WHERE etp.event_id = $1
		 GROUP BY s.id, s.name, s.logo_url
		 ORDER BY total_points DESC
		 LIMIT $2 OFFSET $3`,
		eventID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("SchoolLeaderboard: %w", err)
	}
	defer rows.Close()

	var entries []*model.SchoolLeaderboardEntry
	rank := offset + 1
	for rows.Next() {
		e := &model.SchoolLeaderboardEntry{}
		if err := rows.Scan(&e.SchoolID, &e.SchoolName, &e.SchoolLogo, &e.TotalPoints, &e.TeamCount); err != nil {
			return nil, 0, fmt.Errorf("SchoolLeaderboard scan: %w", err)
		}
		e.Rank = rank
		rank++
		entries = append(entries, e)
	}
	return entries, total, rows.Err()
}

func (r *eventTeamPointsRepo) SchoolLeaderboardGlobal(ctx context.Context, limit, offset int) ([]*model.SchoolLeaderboardEntry, int, error) {
	var total int
	if err := r.db.QueryRow(ctx,
		`SELECT COUNT(DISTINCT t.school_id)
		 FROM event_team_points etp
		 JOIN teams t ON t.id = etp.team_id
		 WHERE t.school_id IS NOT NULL`).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("SchoolLeaderboardGlobal count: %w", err)
	}

	rows, err := r.db.Query(ctx,
		`SELECT s.id, s.name, s.logo_url, SUM(etp.points) AS total_points, COUNT(DISTINCT t.id) AS team_count
		 FROM event_team_points etp
		 JOIN teams t ON t.id = etp.team_id
		 JOIN schools s ON s.id = t.school_id
		 GROUP BY s.id, s.name, s.logo_url
		 ORDER BY total_points DESC
		 LIMIT $1 OFFSET $2`,
		limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("SchoolLeaderboardGlobal: %w", err)
	}
	defer rows.Close()

	var entries []*model.SchoolLeaderboardEntry
	rank := offset + 1
	for rows.Next() {
		e := &model.SchoolLeaderboardEntry{}
		if err := rows.Scan(&e.SchoolID, &e.SchoolName, &e.SchoolLogo, &e.TotalPoints, &e.TeamCount); err != nil {
			return nil, 0, fmt.Errorf("SchoolLeaderboardGlobal scan: %w", err)
		}
		e.Rank = rank
		rank++
		entries = append(entries, e)
	}
	return entries, total, rows.Err()
}
