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

// ──────────────────────────────────────────────
// PlayerStatsRepo
// ──────────────────────────────────────────────

type playerStatsRepo struct {
	db *pgxpool.Pool
}

func NewPlayerStatsRepo(db *pgxpool.Pool) model.PlayerStatsRepository {
	return &playerStatsRepo{db: db}
}

func (r *playerStatsRepo) FindByUser(ctx context.Context, userID uuid.UUID) ([]*model.PlayerStats, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, user_id, game_id, tournament_id, matches_played, wins, losses,
		        mvp_count, total_kills, total_deaths, total_assists, avg_score, updated_at
		 FROM player_stats WHERE user_id = $1 ORDER BY updated_at DESC`, userID)
	if err != nil {
		return nil, fmt.Errorf("FindByUser: %w", err)
	}
	defer rows.Close()

	return scanPlayerStatsRows(rows)
}

func (r *playerStatsRepo) FindByUserAndGame(ctx context.Context, userID, gameID uuid.UUID) ([]*model.PlayerStats, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, user_id, game_id, tournament_id, matches_played, wins, losses,
		        mvp_count, total_kills, total_deaths, total_assists, avg_score, updated_at
		 FROM player_stats WHERE user_id = $1 AND game_id = $2 ORDER BY updated_at DESC`, userID, gameID)
	if err != nil {
		return nil, fmt.Errorf("FindByUserAndGame: %w", err)
	}
	defer rows.Close()

	return scanPlayerStatsRows(rows)
}

func (r *playerStatsRepo) Upsert(ctx context.Context, ps *model.PlayerStats) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO player_stats (user_id, game_id, tournament_id, matches_played, wins, losses,
		                           mvp_count, total_kills, total_deaths, total_assists, avg_score, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		 ON CONFLICT (user_id, game_id, tournament_id)
		 DO UPDATE SET matches_played = EXCLUDED.matches_played,
		              wins = EXCLUDED.wins,
		              losses = EXCLUDED.losses,
		              mvp_count = EXCLUDED.mvp_count,
		              total_kills = EXCLUDED.total_kills,
		              total_deaths = EXCLUDED.total_deaths,
		              total_assists = EXCLUDED.total_assists,
		              avg_score = EXCLUDED.avg_score,
		              updated_at = NOW()`,
		ps.UserID, ps.GameID, ps.TournamentID, ps.MatchesPlayed, ps.Wins, ps.Losses,
		ps.MVPCount, ps.TotalKills, ps.TotalDeaths, ps.TotalAssists, ps.AvgScore, time.Now())
	if err != nil {
		return fmt.Errorf("Upsert: %w", err)
	}
	return nil
}

func (r *playerStatsRepo) IncrementWin(ctx context.Context, userID, gameID uuid.UUID, tournamentID *uuid.UUID) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO player_stats (user_id, game_id, tournament_id, matches_played, wins, updated_at)
		 VALUES ($1, $2, $3, 1, 1, NOW())
		 ON CONFLICT (user_id, game_id, tournament_id)
		 DO UPDATE SET matches_played = player_stats.matches_played + 1,
		              wins = player_stats.wins + 1,
		              updated_at = NOW()`,
		userID, gameID, tournamentID)
	if err != nil {
		return fmt.Errorf("IncrementWin: %w", err)
	}
	return nil
}

func (r *playerStatsRepo) IncrementLoss(ctx context.Context, userID, gameID uuid.UUID, tournamentID *uuid.UUID) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO player_stats (user_id, game_id, tournament_id, matches_played, losses, updated_at)
		 VALUES ($1, $2, $3, 1, 0, NOW())
		 ON CONFLICT (user_id, game_id, tournament_id)
		 DO UPDATE SET matches_played = player_stats.matches_played + 1,
		              losses = player_stats.losses + 1,
		              updated_at = NOW()`,
		userID, gameID, tournamentID)
	if err != nil {
		return fmt.Errorf("IncrementLoss: %w", err)
	}
	return nil
}

func (r *playerStatsRepo) IncrementMVP(ctx context.Context, userID, gameID uuid.UUID, tournamentID *uuid.UUID) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO player_stats (user_id, game_id, tournament_id, mvp_count, updated_at)
		 VALUES ($1, $2, $3, 1, NOW())
		 ON CONFLICT (user_id, game_id, tournament_id)
		 DO UPDATE SET mvp_count = player_stats.mvp_count + 1,
		              updated_at = NOW()`,
		userID, gameID, tournamentID)
	if err != nil {
		return fmt.Errorf("IncrementMVP: %w", err)
	}
	return nil
}

func scanPlayerStatsRows(rows pgx.Rows) ([]*model.PlayerStats, error) {
	var stats []*model.PlayerStats
	for rows.Next() {
		ps := &model.PlayerStats{}
		if err := rows.Scan(
			&ps.ID, &ps.UserID, &ps.GameID, &ps.TournamentID,
			&ps.MatchesPlayed, &ps.Wins, &ps.Losses,
			&ps.MVPCount, &ps.TotalKills, &ps.TotalDeaths, &ps.TotalAssists,
			&ps.AvgScore, &ps.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scanPlayerStatsRows: %w", err)
		}
		stats = append(stats, ps)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("scanPlayerStatsRows rows: %w", err)
	}
	return stats, nil
}

// ──────────────────────────────────────────────
// AchievementRepo
// ──────────────────────────────────────────────

type achievementRepo struct {
	db *pgxpool.Pool
}

func NewAchievementRepo(db *pgxpool.Pool) model.AchievementRepository {
	return &achievementRepo{db: db}
}

func (r *achievementRepo) FindAll(ctx context.Context) ([]*model.Achievement, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, slug, name, description, icon, category, criteria, created_at
		 FROM achievements ORDER BY category, name ASC`)
	if err != nil {
		return nil, fmt.Errorf("FindAll: %w", err)
	}
	defer rows.Close()

	var achievements []*model.Achievement
	for rows.Next() {
		a := &model.Achievement{}
		if err := rows.Scan(&a.ID, &a.Slug, &a.Name, &a.Description, &a.Icon, &a.Category, &a.Criteria, &a.CreatedAt); err != nil {
			return nil, fmt.Errorf("FindAll scan: %w", err)
		}
		achievements = append(achievements, a)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("FindAll rows: %w", err)
	}
	return achievements, nil
}

func (r *achievementRepo) FindBySlug(ctx context.Context, slug string) (*model.Achievement, error) {
	a := &model.Achievement{}
	err := r.db.QueryRow(ctx,
		`SELECT id, slug, name, description, icon, category, criteria, created_at
		 FROM achievements WHERE slug = $1`, slug).
		Scan(&a.ID, &a.Slug, &a.Name, &a.Description, &a.Icon, &a.Category, &a.Criteria, &a.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("FindBySlug: %w", err)
	}
	return a, nil
}

func (r *achievementRepo) CreateUserAchievement(ctx context.Context, ua *model.UserAchievement) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO user_achievements (user_id, achievement_id, earned_at, tournament_id)
		 VALUES ($1, $2, $3, $4)
		 ON CONFLICT (user_id, achievement_id, tournament_id) DO NOTHING`,
		ua.UserID, ua.AchievementID, ua.EarnedAt, ua.TournamentID)
	if err != nil {
		return fmt.Errorf("CreateUserAchievement: %w", err)
	}
	return nil
}

func (r *achievementRepo) FindUserAchievements(ctx context.Context, userID uuid.UUID) ([]*model.UserAchievement, error) {
	rows, err := r.db.Query(ctx,
		`SELECT ua.id, ua.user_id, ua.achievement_id, ua.earned_at, ua.tournament_id,
		        a.id, a.slug, a.name, a.description, a.icon, a.category, a.criteria, a.created_at
		 FROM user_achievements ua
		 JOIN achievements a ON a.id = ua.achievement_id
		 WHERE ua.user_id = $1
		 ORDER BY ua.earned_at DESC`, userID)
	if err != nil {
		return nil, fmt.Errorf("FindUserAchievements: %w", err)
	}
	defer rows.Close()

	var uas []*model.UserAchievement
	for rows.Next() {
		ua := &model.UserAchievement{}
		a := &model.Achievement{}
		if err := rows.Scan(
			&ua.ID, &ua.UserID, &ua.AchievementID, &ua.EarnedAt, &ua.TournamentID,
			&a.ID, &a.Slug, &a.Name, &a.Description, &a.Icon, &a.Category, &a.Criteria, &a.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("FindUserAchievements scan: %w", err)
		}
		ua.Achievement = a
		uas = append(uas, ua)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("FindUserAchievements rows: %w", err)
	}
	return uas, nil
}

func (r *achievementRepo) HasUserAchievement(ctx context.Context, userID, achievementID uuid.UUID) (bool, error) {
	var count int
	err := r.db.QueryRow(ctx,
		`SELECT COUNT(*) FROM user_achievements WHERE user_id = $1 AND achievement_id = $2`,
		userID, achievementID).Scan(&count)
	if err != nil {
		return false, fmt.Errorf("HasUserAchievement: %w", err)
	}
	return count > 0, nil
}
