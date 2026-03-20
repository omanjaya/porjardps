package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/porjar-denpasar/porjar-api/internal/model"
)

type brDailyStandingsRepo struct {
	db *pgxpool.Pool
}

func NewBRDailyStandingsRepo(db *pgxpool.Pool) model.BRDailyStandingsRepository {
	return &brDailyStandingsRepo{db: db}
}

func (r *brDailyStandingsRepo) Upsert(ctx context.Context, s *model.BRDailyStanding) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO br_daily_standings (id, tournament_id, team_id, day_number, total_points, total_kills, rank_position, is_qualified)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		 ON CONFLICT (tournament_id, team_id, day_number) DO UPDATE SET
		        total_points = EXCLUDED.total_points,
		        total_kills = EXCLUDED.total_kills,
		        rank_position = EXCLUDED.rank_position,
		        is_qualified = EXCLUDED.is_qualified`,
		s.ID, s.TournamentID, s.TeamID, s.DayNumber, s.TotalPoints, s.TotalKills, s.RankPosition, s.IsQualified)
	if err != nil {
		return fmt.Errorf("Upsert: %w", err)
	}
	return nil
}

func (r *brDailyStandingsRepo) FindByTournamentAndDay(ctx context.Context, tournamentID uuid.UUID, dayNumber int) ([]*model.BRDailyStanding, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, tournament_id, team_id, day_number, total_points, total_kills, rank_position, is_qualified
		 FROM br_daily_standings
		 WHERE tournament_id = $1 AND day_number = $2
		 ORDER BY rank_position ASC NULLS LAST, total_points DESC, total_kills DESC`,
		tournamentID, dayNumber)
	if err != nil {
		return nil, fmt.Errorf("FindByTournamentAndDay: %w", err)
	}
	defer rows.Close()

	var standings []*model.BRDailyStanding
	for rows.Next() {
		s := &model.BRDailyStanding{}
		if err := rows.Scan(&s.ID, &s.TournamentID, &s.TeamID, &s.DayNumber,
			&s.TotalPoints, &s.TotalKills, &s.RankPosition, &s.IsQualified); err != nil {
			return nil, fmt.Errorf("FindByTournamentAndDay scan: %w", err)
		}
		standings = append(standings, s)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("FindByTournamentAndDay rows: %w", err)
	}

	return standings, nil
}

func (r *brDailyStandingsRepo) UpdateRanks(ctx context.Context, tournamentID uuid.UUID, dayNumber int) error {
	_, err := r.db.Exec(ctx,
		`UPDATE br_daily_standings SET rank_position = sub.rank
		 FROM (
		     SELECT id, ROW_NUMBER() OVER (ORDER BY total_points DESC, total_kills DESC) as rank
		     FROM br_daily_standings
		     WHERE tournament_id = $1 AND day_number = $2
		 ) sub
		 WHERE br_daily_standings.id = sub.id`,
		tournamentID, dayNumber)
	if err != nil {
		return fmt.Errorf("UpdateRanks: %w", err)
	}
	return nil
}
