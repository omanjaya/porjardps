package model

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type PlayerStats struct {
	ID             uuid.UUID  `json:"id"`
	UserID         uuid.UUID  `json:"user_id"`
	GameID         uuid.UUID  `json:"game_id"`
	TournamentID   *uuid.UUID `json:"tournament_id,omitempty"`
	MatchesPlayed  int        `json:"matches_played"`
	Wins           int        `json:"wins"`
	Losses         int        `json:"losses"`
	MVPCount       int        `json:"mvp_count"`
	TotalKills     int        `json:"total_kills"`
	TotalDeaths    int        `json:"total_deaths"`
	TotalAssists   int        `json:"total_assists"`
	AvgScore       float64    `json:"avg_score"`
	UpdatedAt      time.Time  `json:"updated_at"`
}

type Achievement struct {
	ID          uuid.UUID       `json:"id"`
	Slug        string          `json:"slug"`
	Name        string          `json:"name"`
	Description *string         `json:"description"`
	Icon        string          `json:"icon"`
	Category    string          `json:"category"`
	Criteria    json.RawMessage `json:"criteria,omitempty"`
	CreatedAt   time.Time       `json:"created_at"`
}

type UserAchievement struct {
	ID            uuid.UUID  `json:"id"`
	UserID        uuid.UUID  `json:"user_id"`
	AchievementID uuid.UUID  `json:"achievement_id"`
	EarnedAt      time.Time  `json:"earned_at"`
	TournamentID  *uuid.UUID `json:"tournament_id,omitempty"`
	Achievement   *Achievement `json:"achievement,omitempty"`
}

// PlayerProfile is the aggregated profile returned by the API.
// User is represented as UserPublicResponse to avoid leaking contact info.
type PlayerProfile struct {
	User           UserPublicResponse `json:"user"`
	TotalMatches   int                `json:"total_matches"`
	TotalWins      int                `json:"total_wins"`
	TotalLosses    int                `json:"total_losses"`
	WinRate        float64            `json:"win_rate"`
	TotalMVP       int                `json:"total_mvp"`
	GamesPlayed    int                `json:"games_played"`
	Achievements   []*UserAchievement `json:"achievements"`
	GameStats      []*GameStatsItem   `json:"game_stats"`
}

type GameStatsItem struct {
	Game          *Game   `json:"game"`
	MatchesPlayed int     `json:"matches_played"`
	Wins          int     `json:"wins"`
	Losses        int     `json:"losses"`
	WinRate       float64 `json:"win_rate"`
	MVPCount      int     `json:"mvp_count"`
	TotalKills    int     `json:"total_kills"`
	TotalDeaths   int     `json:"total_deaths"`
	TotalAssists  int     `json:"total_assists"`
	AvgScore      float64 `json:"avg_score"`
}

// MatchResult is passed to UpdateAfterMatch to record stats.
type MatchResult struct {
	UserID       uuid.UUID
	GameID       uuid.UUID
	TournamentID *uuid.UUID
	Won          bool
	IsMVP        bool
	Kills        int
	Deaths       int
	Assists      int
	Score        float64
}

type PlayerStatsRepository interface {
	FindByUser(ctx context.Context, userID uuid.UUID) ([]*PlayerStats, error)
	FindByUserAndGame(ctx context.Context, userID, gameID uuid.UUID) ([]*PlayerStats, error)
	Upsert(ctx context.Context, ps *PlayerStats) error
	IncrementWin(ctx context.Context, userID, gameID uuid.UUID, tournamentID *uuid.UUID) error
	IncrementLoss(ctx context.Context, userID, gameID uuid.UUID, tournamentID *uuid.UUID) error
	IncrementMVP(ctx context.Context, userID, gameID uuid.UUID, tournamentID *uuid.UUID) error
}

type AchievementRepository interface {
	FindAll(ctx context.Context) ([]*Achievement, error)
	FindBySlug(ctx context.Context, slug string) (*Achievement, error)
	CreateUserAchievement(ctx context.Context, ua *UserAchievement) error
	FindUserAchievements(ctx context.Context, userID uuid.UUID) ([]*UserAchievement, error)
	HasUserAchievement(ctx context.Context, userID, achievementID uuid.UUID) (bool, error)
}
