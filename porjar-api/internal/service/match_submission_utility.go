package service

import (
	"context"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
)

// isTournamentLiveNow returns true if the tournament's daily_start_time is set
// and the current WITA time (UTC+8) is at or past that start time.
func (s *MatchSubmissionService) isTournamentLiveNow(ctx context.Context, tournamentID uuid.UUID) bool {
	if s.tournamentRepo == nil {
		return false
	}
	tournament, err := s.tournamentRepo.FindByID(ctx, tournamentID)
	if err != nil || tournament == nil || tournament.DailyStartTime == nil {
		return false
	}
	loc, err := time.LoadLocation("Asia/Makassar")
	if err != nil {
		loc = time.UTC
	}
	now := time.Now().In(loc)
	parts := strings.Split(*tournament.DailyStartTime, ":")
	if len(parts) < 2 {
		return false
	}
	startHour, _ := strconv.Atoi(parts[0])
	startMin, _ := strconv.Atoi(parts[1])
	nowMins := now.Hour()*60 + now.Minute()
	startMins := startHour*60 + startMin
	return nowMins >= startMins
}

// gameMaxScreenshots returns the maximum number of screenshots allowed per game.
func gameMaxScreenshots(slug string, matchType string, bestOf int) int {
	switch matchType {
	case "bracket":
		switch slug {
		case "ml":
			return 1
		case "hok":
			if bestOf > 0 {
				return bestOf
			}
			return 3
		case "efootball":
			return 1
		default:
			return 5
		}
	case "battle_royale":
		return 2
	default:
		return 5
	}
}

// getGameSlugForTeam fetches the game slug for a given team.
func (s *MatchSubmissionService) getGameSlugForTeam(ctx context.Context, teamID uuid.UUID) (string, error) {
	team, err := s.teamRepo.FindByID(ctx, teamID)
	if err != nil || team == nil {
		return "", apperror.NotFound("TEAM")
	}
	game, err := s.gameRepo.FindByID(ctx, team.GameID)
	if err != nil || game == nil {
		return "", apperror.NotFound("GAME")
	}
	return game.Slug, nil
}

// FindBracketMatch returns a bracket match by ID (used by handler to resolve team).
func (s *MatchSubmissionService) FindBracketMatch(ctx context.Context, matchID uuid.UUID) (*model.BracketMatch, error) {
	return s.bracketRepo.FindByID(ctx, matchID)
}
