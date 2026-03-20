package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
)

// UpdateMatchStatus changes the status of a match with valid transition checks.
// Valid transitions: pending -> scheduled -> live -> completed
func (s *BracketService) UpdateMatchStatus(ctx context.Context, matchID uuid.UUID, status string) error {
	match, err := s.bracketRepo.FindByID(ctx, matchID)
	if err != nil || match == nil {
		return apperror.NotFound("MATCH")
	}

	if match.Status == "completed" {
		return apperror.BusinessRule("CANNOT_EDIT_COMPLETED_MATCH", "Match yang sudah selesai tidak dapat diubah statusnya")
	}

	if !isValidTransition(match.Status, status) {
		return apperror.BusinessRule("INVALID_STATUS_TRANSITION",
			fmt.Sprintf("Transisi status dari '%s' ke '%s' tidak valid", match.Status, status))
	}

	if err := s.bracketRepo.UpdateStatus(ctx, matchID, status); err != nil {
		return apperror.Wrap(err, "update match status")
	}

	// If transitioning to live, set started_at
	if status == "live" {
		now := time.Now()
		match.StartedAt = &now
		match.Status = status
		if err := s.bracketRepo.Update(ctx, match); err != nil {
			slog.Error("failed to update started_at", "error", err)
		}
	}

	// Broadcast status update
	s.broadcastMatchUpdate(match.TournamentID, matchID, "match_status", map[string]interface{}{
		"match_id": matchID,
		"status":   status,
	})

	return nil
}

// UpdateMatchScore updates the score of a live match.
func (s *BracketService) UpdateMatchScore(ctx context.Context, matchID uuid.UUID, scoreA, scoreB int) error {
	match, err := s.bracketRepo.FindByID(ctx, matchID)
	if err != nil || match == nil {
		return apperror.NotFound("MATCH")
	}

	if match.Status != "live" {
		return apperror.BusinessRule("MATCH_NOT_LIVE", "Skor hanya bisa diupdate saat match sedang berlangsung")
	}

	match.ScoreA = &scoreA
	match.ScoreB = &scoreB
	if err := s.bracketRepo.Update(ctx, match); err != nil {
		return apperror.Wrap(err, "update match score")
	}

	// Broadcast score update
	s.broadcastMatchUpdate(match.TournamentID, matchID, "score_update", map[string]interface{}{
		"match_id": matchID,
		"score_a":  scoreA,
		"score_b":  scoreB,
	})

	return nil
}

// InputGameScore records the result of an individual game within a best-of series.
func (s *BracketService) InputGameScore(
	ctx context.Context,
	matchID uuid.UUID,
	gameNumber int,
	winnerID uuid.UUID,
	scoreA, scoreB int,
	durationMinutes *int,
	mvpUserID *uuid.UUID,
	mapName *string,
	heroBans json.RawMessage,
) error {
	match, err := s.bracketRepo.FindByID(ctx, matchID)
	if err != nil || match == nil {
		return apperror.NotFound("MATCH")
	}

	if match.Status != "live" {
		return apperror.BusinessRule("MATCH_NOT_LIVE", "Game score hanya bisa diinput saat match sedang berlangsung")
	}

	// Validate game number (must be >= 1)
	if gameNumber < 1 {
		return apperror.BusinessRule("GAME_NUMBER_INVALID", "Nomor game harus minimal 1")
	}

	// Get existing games to check series state
	existingGames, err := s.matchGameRepo.ListByMatch(ctx, matchID)
	if err != nil {
		return apperror.Wrap(err, "list existing games")
	}

	// Check game number is sequential
	if gameNumber != len(existingGames)+1 {
		return apperror.BusinessRule("GAME_NUMBER_INVALID",
			fmt.Sprintf("Game number harus %d (sequential)", len(existingGames)+1))
	}

	// Check if series is already decided (count wins per team)
	// We need the tournament's best_of to determine series length
	tournament, err := s.tournamentRepo.FindByID(ctx, match.TournamentID)
	if err != nil || tournament == nil {
		return apperror.NotFound("TOURNAMENT")
	}

	winsNeeded := (tournament.BestOf / 2) + 1
	teamAWins, teamBWins := countWins(existingGames, match.TeamAID, match.TeamBID)

	if teamAWins >= winsNeeded || teamBWins >= winsNeeded {
		return apperror.BusinessRule("SERIES_ALREADY_DECIDED", "Seri pertandingan sudah diputuskan")
	}

	// Validate winner is team_a or team_b
	if match.TeamAID == nil || match.TeamBID == nil {
		return apperror.BusinessRule("INVALID_WINNER", "Match belum memiliki kedua tim")
	}
	if winnerID != *match.TeamAID && winnerID != *match.TeamBID {
		return apperror.BusinessRule("INVALID_WINNER", "Winner harus salah satu dari team_a atau team_b")
	}

	game := &model.MatchGame{
		ID:              uuid.New(),
		BracketMatchID:  matchID,
		GameNumber:      gameNumber,
		WinnerID:        &winnerID,
		ScoreA:          &scoreA,
		ScoreB:          &scoreB,
		DurationMinutes: durationMinutes,
		MvpUserID:       mvpUserID,
		MapName:         mapName,
		HeroBans:        heroBans,
	}

	if err := s.matchGameRepo.Create(ctx, game); err != nil {
		return apperror.Wrap(err, "create match game")
	}

	// Update match series score
	if winnerID == *match.TeamAID {
		teamAWins++
	} else {
		teamBWins++
	}
	if err := s.updateMatchSeriesScore(ctx, match, teamAWins, teamBWins); err != nil {
		slog.Error("failed to update series score", "error", err)
	}

	// Broadcast game score
	s.broadcastMatchUpdate(match.TournamentID, matchID, "game_score", map[string]interface{}{
		"match_id":    matchID,
		"game_number": gameNumber,
		"winner_id":   winnerID,
		"score_a":     scoreA,
		"score_b":     scoreB,
		"series_a":    teamAWins,
		"series_b":    teamBWins,
	})

	return nil
}

// CompleteMatch finalizes a match with the given winner.
func (s *BracketService) CompleteMatch(ctx context.Context, matchID uuid.UUID, winnerID uuid.UUID) error {
	match, err := s.bracketRepo.FindByID(ctx, matchID)
	if err != nil || match == nil {
		return apperror.NotFound("MATCH")
	}

	if match.Status != "live" {
		return apperror.BusinessRule("MATCH_NOT_LIVE", "Match harus berstatus live untuk diselesaikan")
	}

	// Validate winner
	if match.TeamAID == nil || match.TeamBID == nil {
		return apperror.BusinessRule("INVALID_WINNER", "Match belum memiliki kedua tim")
	}
	if winnerID != *match.TeamAID && winnerID != *match.TeamBID {
		return apperror.BusinessRule("INVALID_WINNER", "Winner harus salah satu dari team_a atau team_b")
	}

	// Determine loser
	var loserID uuid.UUID
	if winnerID == *match.TeamAID {
		loserID = *match.TeamBID
	} else {
		loserID = *match.TeamAID
	}

	// Validate score consistency if scores are set
	if match.ScoreA != nil && match.ScoreB != nil {
		if winnerID == *match.TeamAID && *match.ScoreA < *match.ScoreB {
			return apperror.BusinessRule("SCORE_MISMATCH", "Winner memiliki skor lebih rendah dari lawan")
		}
		if winnerID == *match.TeamBID && *match.ScoreB < *match.ScoreA {
			return apperror.BusinessRule("SCORE_MISMATCH", "Winner memiliki skor lebih rendah dari lawan")
		}
	}

	scoreA := 0
	scoreB := 0
	if match.ScoreA != nil {
		scoreA = *match.ScoreA
	}
	if match.ScoreB != nil {
		scoreB = *match.ScoreB
	}

	// Update match result
	if err := s.bracketRepo.UpdateResult(ctx, matchID, winnerID, loserID, scoreA, scoreB); err != nil {
		return apperror.Wrap(err, "update match result")
	}

	// Advance winner to next match
	if match.NextMatchID != nil {
		s.advanceWinner(ctx, match, winnerID)
	}

	// Update standings for loser (eliminated)
	if s.standingsRepo != nil {
		standing, err := s.standingsRepo.FindByTournamentAndTeam(ctx, match.TournamentID, loserID)
		if err == nil && standing != nil {
			standing.IsEliminated = true
			standing.Losses++
			standing.MatchesPlayed++
			if err := s.standingsRepo.Update(ctx, standing); err != nil {
				slog.Error("failed to update loser standing", "error", err)
			}
		}

		// Update winner standing
		winnerStanding, err := s.standingsRepo.FindByTournamentAndTeam(ctx, match.TournamentID, winnerID)
		if err == nil && winnerStanding != nil {
			winnerStanding.Wins++
			winnerStanding.MatchesPlayed++
			if err := s.standingsRepo.Update(ctx, winnerStanding); err != nil {
				slog.Error("failed to update winner standing", "error", err)
			}
		}
	}

	// Fetch team names for broadcast
	winnerName := ""
	loserName := ""
	if s.teamRepo != nil {
		teams, err := s.teamRepo.FindByIDs(ctx, []uuid.UUID{winnerID, loserID})
		if err == nil {
			for _, t := range teams {
				switch t.ID {
				case winnerID:
					winnerName = t.Name
				case loserID:
					loserName = t.Name
				}
			}
		}
	}

	// Broadcast match complete
	s.broadcastMatchUpdate(match.TournamentID, matchID, "match_complete", map[string]interface{}{
		"match_id":    matchID,
		"winner_id":   winnerID,
		"loser_id":    loserID,
		"score_a":     scoreA,
		"score_b":     scoreB,
		"winner_name": winnerName,
		"loser_name":  loserName,
	})

	// Persist notifications for all team members
	if s.notifSvc != nil && s.memberRepo != nil && winnerName != "" {
		go s.notifSvc.NotifyMatchResult(ctx, winnerID, loserID, winnerName, loserName, s.memberRepo)
	}

	return nil
}

// ScheduleMatch sets the scheduled_at time for a single match and transitions to "scheduled" if pending.
func (s *BracketService) ScheduleMatch(ctx context.Context, matchID uuid.UUID, scheduledAt time.Time) error {
	match, err := s.bracketRepo.FindByID(ctx, matchID)
	if err != nil || match == nil {
		return apperror.NotFound("MATCH")
	}

	if match.Status != "pending" && match.Status != "scheduled" {
		return apperror.BusinessRule("INVALID_MATCH_STATUS", "Hanya match pending atau scheduled yang bisa dijadwalkan")
	}

	match.ScheduledAt = &scheduledAt
	if match.Status == "pending" {
		match.Status = "scheduled"
	}

	if err := s.bracketRepo.Update(ctx, match); err != nil {
		return apperror.Wrap(err, "update match schedule")
	}

	return nil
}

// ScheduleRound sets all pending matches in a tournament round to "scheduled".
func (s *BracketService) ScheduleRound(ctx context.Context, tournamentID uuid.UUID, round int, scheduledAt *time.Time) (int, error) {
	matches, err := s.bracketRepo.ListByTournamentAndRound(ctx, tournamentID, round)
	if err != nil {
		return 0, apperror.Wrap(err, "list round matches")
	}

	count := 0
	for _, m := range matches {
		if m.Status == "pending" || m.Status == "scheduled" {
			m.Status = "scheduled"
			m.ScheduledAt = scheduledAt
			if err := s.bracketRepo.Update(ctx, m); err == nil {
				count++
			}
		}
	}
	return count, nil
}

// UpdateMatchBestOf updates the best_of value for a single match.
func (s *BracketService) UpdateMatchBestOf(ctx context.Context, matchID uuid.UUID, bestOf int) error {
	_, err := s.bracketRepo.FindByID(ctx, matchID)
	if err != nil {
		return apperror.Wrap(err, "find match")
	}
	return s.bracketRepo.UpdateBestOf(ctx, matchID, bestOf)
}
