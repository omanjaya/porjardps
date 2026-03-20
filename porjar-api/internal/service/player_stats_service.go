package service

import (
	"context"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
)

type PlayerStatsService struct {
	statsRepo       model.PlayerStatsRepository
	achievementRepo model.AchievementRepository
	userRepo        model.UserRepository
	gameRepo        model.GameRepository
}

func NewPlayerStatsService(
	statsRepo model.PlayerStatsRepository,
	achievementRepo model.AchievementRepository,
	userRepo model.UserRepository,
	gameRepo model.GameRepository,
) *PlayerStatsService {
	return &PlayerStatsService{
		statsRepo:       statsRepo,
		achievementRepo: achievementRepo,
		userRepo:        userRepo,
		gameRepo:        gameRepo,
	}
}

// PlayerSummary is a lightweight public representation of a player.
type PlayerSummary struct {
	ID        string  `json:"id"`
	FullName  string  `json:"full_name"`
	AvatarURL *string `json:"avatar_url"`
}

// ListPlayers returns a paginated list of players (role=player) for public discovery.
func (s *PlayerStatsService) ListPlayers(ctx context.Context, search string, page, limit int) ([]*PlayerSummary, int, error) {
	role := "player"
	filter := model.UserFilter{
		Role:  &role,
		Page:  page,
		Limit: limit,
	}
	if search != "" {
		filter.Search = &search
	}

	users, total, err := s.userRepo.List(ctx, filter)
	if err != nil {
		return nil, 0, apperror.Wrap(err, "list players")
	}

	result := make([]*PlayerSummary, len(users))
	for i, u := range users {
		result[i] = &PlayerSummary{
			ID:        u.ID.String(),
			FullName:  u.FullName,
			AvatarURL: u.AvatarURL,
		}
	}
	return result, total, nil
}

// GetPlayerProfile returns aggregated stats across all games for a user.
func (s *PlayerStatsService) GetPlayerProfile(ctx context.Context, userID uuid.UUID) (*model.PlayerProfile, error) {
	user, err := s.userRepo.FindByID(ctx, userID)
	if err != nil || user == nil {
		return nil, apperror.NotFound("player")
	}

	allStats, err := s.statsRepo.FindByUser(ctx, userID)
	if err != nil {
		return nil, apperror.Wrap(err, "find player stats")
	}

	achievements, err := s.achievementRepo.FindUserAchievements(ctx, userID)
	if err != nil {
		return nil, apperror.Wrap(err, "find user achievements")
	}

	// Aggregate per game
	gameMap := make(map[uuid.UUID]*model.GameStatsItem)
	var totalMatches, totalWins, totalLosses, totalMVP int

	for _, ps := range allStats {
		totalMatches += ps.MatchesPlayed
		totalWins += ps.Wins
		totalLosses += ps.Losses
		totalMVP += ps.MVPCount

		item, ok := gameMap[ps.GameID]
		if !ok {
			game, gErr := s.gameRepo.FindByID(ctx, ps.GameID)
			if gErr != nil || game == nil {
				continue
			}
			item = &model.GameStatsItem{Game: game}
			gameMap[ps.GameID] = item
		}
		item.MatchesPlayed += ps.MatchesPlayed
		item.Wins += ps.Wins
		item.Losses += ps.Losses
		item.MVPCount += ps.MVPCount
		item.TotalKills += ps.TotalKills
		item.TotalDeaths += ps.TotalDeaths
		item.TotalAssists += ps.TotalAssists
	}

	var gameStats []*model.GameStatsItem
	for _, item := range gameMap {
		if item.MatchesPlayed > 0 {
			item.WinRate = float64(item.Wins) / float64(item.MatchesPlayed) * 100
		}
		gameStats = append(gameStats, item)
	}

	var winRate float64
	if totalMatches > 0 {
		winRate = float64(totalWins) / float64(totalMatches) * 100
	}

	profile := &model.PlayerProfile{
		User:         user.ToPublic(),
		TotalMatches: totalMatches,
		TotalWins:    totalWins,
		TotalLosses:  totalLosses,
		WinRate:      winRate,
		TotalMVP:     totalMVP,
		GamesPlayed:  len(gameMap),
		Achievements: achievements,
		GameStats:    gameStats,
	}

	return profile, nil
}

// GetPlayerGameStats returns per-game breakdown for a user.
func (s *PlayerStatsService) GetPlayerGameStats(ctx context.Context, userID uuid.UUID, gameSlug string) (*model.GameStatsItem, error) {
	game, err := s.gameRepo.FindBySlug(ctx, gameSlug)
	if err != nil || game == nil {
		return nil, apperror.NotFound("game")
	}

	stats, err := s.statsRepo.FindByUserAndGame(ctx, userID, game.ID)
	if err != nil {
		return nil, apperror.Wrap(err, "find player game stats")
	}

	item := &model.GameStatsItem{Game: game}
	for _, ps := range stats {
		item.MatchesPlayed += ps.MatchesPlayed
		item.Wins += ps.Wins
		item.Losses += ps.Losses
		item.MVPCount += ps.MVPCount
		item.TotalKills += ps.TotalKills
		item.TotalDeaths += ps.TotalDeaths
		item.TotalAssists += ps.TotalAssists
	}
	if item.MatchesPlayed > 0 {
		item.WinRate = float64(item.Wins) / float64(item.MatchesPlayed) * 100
	}

	return item, nil
}

// UpdateAfterMatch records stats after a match is completed.
func (s *PlayerStatsService) UpdateAfterMatch(ctx context.Context, result model.MatchResult) error {
	if result.Won {
		if err := s.statsRepo.IncrementWin(ctx, result.UserID, result.GameID, result.TournamentID); err != nil {
			return apperror.Wrap(err, "increment win")
		}
	} else {
		if err := s.statsRepo.IncrementLoss(ctx, result.UserID, result.GameID, result.TournamentID); err != nil {
			return apperror.Wrap(err, "increment loss")
		}
	}

	if result.IsMVP {
		if err := s.statsRepo.IncrementMVP(ctx, result.UserID, result.GameID, result.TournamentID); err != nil {
			return apperror.Wrap(err, "increment mvp")
		}
	}

	// Update kills/deaths/assists via upsert
	existing, err := s.statsRepo.FindByUserAndGame(ctx, result.UserID, result.GameID)
	if err != nil {
		return apperror.Wrap(err, "find stats for kda update")
	}

	// Find the matching tournament stat row
	var target *model.PlayerStats
	for _, ps := range existing {
		if (result.TournamentID == nil && ps.TournamentID == nil) ||
			(result.TournamentID != nil && ps.TournamentID != nil && *result.TournamentID == *ps.TournamentID) {
			target = ps
			break
		}
	}

	if target != nil {
		target.TotalKills += result.Kills
		target.TotalDeaths += result.Deaths
		target.TotalAssists += result.Assists
		if target.MatchesPlayed > 0 {
			target.AvgScore = (target.AvgScore*float64(target.MatchesPlayed-1) + result.Score) / float64(target.MatchesPlayed)
		}
		if err := s.statsRepo.Upsert(ctx, target); err != nil {
			return apperror.Wrap(err, "upsert kda stats")
		}
	}

	return nil
}

// GetAllAchievements returns all available achievements.
func (s *PlayerStatsService) GetAllAchievements(ctx context.Context) ([]*model.Achievement, error) {
	return s.achievementRepo.FindAll(ctx)
}

// CheckAndAwardAchievements checks criteria and awards any earned achievements.
func (s *PlayerStatsService) CheckAndAwardAchievements(ctx context.Context, userID uuid.UUID) error {
	allStats, err := s.statsRepo.FindByUser(ctx, userID)
	if err != nil {
		return apperror.Wrap(err, "find stats for achievements")
	}

	// Aggregate totals
	var totalMatches, totalWins, totalMVP, totalKills int
	for _, ps := range allStats {
		totalMatches += ps.MatchesPlayed
		totalWins += ps.Wins
		totalMVP += ps.MVPCount
		totalKills += ps.TotalKills
	}

	achievements, err := s.achievementRepo.FindAll(ctx)
	if err != nil {
		return apperror.Wrap(err, "find all achievements")
	}

	for _, ach := range achievements {
		// Check if already earned
		has, err := s.achievementRepo.HasUserAchievement(ctx, userID, ach.ID)
		if err != nil {
			slog.Warn("check achievement failed", "error", err, "slug", ach.Slug)
			continue
		}
		if has {
			continue
		}

		earned := false
		switch ach.Slug {
		case "first_blood":
			earned = totalWins >= 1
		case "mvp_star":
			earned = totalMVP >= 3
		case "champion":
			// Awarded manually when tournament completes
			continue
		case "undefeated":
			// Need streak tracking; skip auto-award for now
			continue
		case "team_player":
			// Need team count; skip for now
			continue
		case "veteran":
			earned = totalMatches >= 10
		case "killer":
			earned = totalKills >= 50
		}

		if earned {
			ua := &model.UserAchievement{
				ID:            uuid.New(),
				UserID:        userID,
				AchievementID: ach.ID,
				EarnedAt:      time.Now(),
			}
			if err := s.achievementRepo.CreateUserAchievement(ctx, ua); err != nil {
				slog.Warn("award achievement failed", "error", err, "slug", ach.Slug)
			}
		}
	}

	return nil
}
