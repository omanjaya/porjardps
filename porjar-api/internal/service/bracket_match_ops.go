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
	"github.com/porjar-denpasar/porjar-api/internal/pkg/bracket"
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

	// If transitioning to live, set started_at + notify team members
	if status == "live" {
		now := time.Now()
		match.StartedAt = &now
		match.Status = status
		if err := s.bracketRepo.Update(ctx, match); err != nil {
			slog.Error("failed to update started_at", "error", err)
		}

		if s.notifSvc != nil && s.memberRepo != nil && match.TeamAID != nil && match.TeamBID != nil {
			matchLabel := fmt.Sprintf("R%d M%d", match.Round, match.MatchNumber)
			teamIDs := []uuid.UUID{*match.TeamAID, *match.TeamBID}
			go func() {
				bgCtx := context.Background()
				for _, teamID := range teamIDs {
					members, err := s.memberRepo.FindByTeam(bgCtx, teamID)
					if err != nil {
						continue
					}
					for _, m := range members {
						if m.UserID != nil {
						s.notifSvc.NotifyMatchStarting(bgCtx, *m.UserID, matchLabel, matchID)
					}
					}
				}
			}()
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

	// Distributed lock to prevent concurrent completion of the same match (TOCTOU)
	if s.rdb != nil {
		lockKey := fmt.Sprintf("complete_match:lock:%s", matchID.String())
		ok, err := s.rdb.SetNX(ctx, lockKey, "1", 30*time.Second).Result()
		if err != nil {
			slog.Error("CompleteMatch: failed to acquire lock", "match_id", matchID, "error", err)
			return apperror.BusinessRule("MATCH_COMPLETING", "Gagal mengunci match, coba lagi")
		}
		if !ok {
			return apperror.BusinessRule("MATCH_COMPLETING", "Match sedang diproses")
		}
		defer s.rdb.Del(ctx, lockKey)

		// Re-fetch match after lock to prevent TOCTOU race
		match, err = s.bracketRepo.FindByID(ctx, matchID)
		if err != nil || match == nil {
			return apperror.NotFound("MATCH")
		}
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

	// Advance loser to losers bracket (double elimination)
	// If LoserNextMatchID is set, the loser drops into the losers bracket instead of being eliminated.
	if match.LoserNextMatchID != nil {
		s.advanceToLosers(ctx, match, loserID)
	}

	// Grand-final "bracket reset" detection (double elimination only).
	//
	// The grand final match (GF#1) never has NextMatchID/LoserNextMatchID set, so
	// without this check the generic "no path forward => eliminated" rule below
	// would incorrectly eliminate the winners-bracket (WB) finalist on their very
	// FIRST loss whenever the losers-bracket (LB) finalist wins GF#1.
	//
	// Standard double-elimination rule: the LB finalist arrives at GF#1 with
	// exactly 1 prior loss (they must lose zero matches in the losers bracket to
	// get there). The WB finalist arrives with 0 prior losses. So:
	//   - If the WB finalist wins GF#1, the loser (LB finalist) already had 1 loss
	//     -> this is their 2nd loss -> truly eliminated, champion crowned below,
	//     exactly as before (no regression).
	//   - If the LB finalist wins GF#1, the loser (WB finalist) had 0 prior losses
	//     -> this is only their 1st loss -> NOT eliminated; a deciding reset match
	//     (GF#2) is created below and champion crowning is deferred to it.
	// This is determined from the loser's standing BEFORE it is incremented for
	// this match, so it must be computed here, ahead of the increments.
	isGrandFinalReset := false
	if s.standingsRepo != nil && match.BracketPosition != nil && *match.BracketPosition == bracket.BracketPositionGrandFinal {
		if tournament, tErr := s.tournamentRepo.FindByID(ctx, match.TournamentID); tErr == nil && tournament != nil && tournament.Format == "double_elimination" {
			if loserStanding, sErr := s.standingsRepo.FindByTournamentAndTeam(ctx, match.TournamentID, loserID); sErr == nil && loserStanding != nil && loserStanding.Losses == 0 {
				isGrandFinalReset = true
			}
		}
	}

	// Update standings atomically — IncrementBracketStats uses a single SQL
	// INSERT ... ON CONFLICT DO UPDATE so wins/losses/matches_played are incremented
	// without a read-modify-write race (H9 fix).
	if s.standingsRepo != nil {
		if err := s.standingsRepo.IncrementBracketStats(ctx, match.TournamentID, loserID, false); err != nil {
			slog.Error("CRITICAL: failed to increment loser standing after match completion", "match_id", matchID, "team_id", loserID, "error", err)
		}
		// Mark loser eliminated when there is no path into a losers bracket.
		// This is a targeted single-field UPDATE so it does not conflict with the
		// atomic counter increment above. Skipped for a GF#1 loss that triggers a
		// bracket reset — that loser (the WB finalist) is not eliminated yet.
		if match.LoserNextMatchID == nil && !isGrandFinalReset {
			standing, err := s.standingsRepo.FindByTournamentAndTeam(ctx, match.TournamentID, loserID)
			if err == nil && standing != nil {
				standing.IsEliminated = true
				if err := s.standingsRepo.Update(ctx, standing); err != nil {
					slog.Error("CRITICAL: failed to mark loser eliminated after match completion", "match_id", matchID, "team_id", loserID, "error", err)
				}
			}
		}

		if err := s.standingsRepo.IncrementBracketStats(ctx, match.TournamentID, winnerID, true); err != nil {
			slog.Error("CRITICAL: failed to increment winner standing after match completion", "match_id", matchID, "team_id", winnerID, "error", err)
		}
	}

	// Create the deciding grand-final reset match (GF#2) now that both entrants
	// have 1 loss each. Its winner will be crowned champion when IT completes
	// (see the champion auto-set switch below, which excludes GF#1 in this case).
	if isGrandFinalReset {
		if err := s.createGrandFinalReset(ctx, match, winnerID, loserID); err != nil {
			slog.Error("CRITICAL: failed to create grand final reset match", "match_id", matchID, "error", err)
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

	// Notify admins that match completed
	if s.notifSvc != nil && winnerName != "" {
		gameName := ""
		if tournament, err := s.tournamentRepo.FindByID(ctx, match.TournamentID); err == nil && tournament != nil {
			if game, err := s.gameRepo.FindByID(ctx, tournament.GameID); err == nil && game != nil {
				gameName = game.Name
			}
		}
		go s.notifSvc.NotifyAdminMatchCompleted(context.Background(), winnerName, loserName, gameName, matchID)
	}

	// Auto-set tournament champion, format-aware.
	// Best-effort: log error but don't fail the submission flow.
	//
	// Elimination formats (single/double) have a true "final" match: the one
	// whose winner has nowhere left to advance to (NextMatchID == nil &&
	// LoserNextMatchID == nil). Crowning on that condition is correct there.
	//
	// round_robin has NO next-match links on ANY match (every match satisfies
	// NextMatchID == nil && LoserNextMatchID == nil), so that rule must not be
	// used to auto-crown a champion after just the first match completes.
	// Instead, only once every match in the tournament is completed do we look
	// up the rank-1 team from standings (after refreshing rank positions) and
	// crown that team.
	if s.tournamentSvc != nil {
		tournament, tErr := s.tournamentRepo.FindByID(ctx, match.TournamentID)
		if tErr != nil || tournament == nil {
			slog.Error("failed to load tournament for champion auto-set", "tournament_id", match.TournamentID, "error", tErr)
		} else {
			switch tournament.Format {
			case "single_elimination", "double_elimination":
				// isGrandFinalReset guards the case where GF#1 was just won by the
				// losers-bracket finalist: NextMatchID/LoserNextMatchID are both nil
				// on GF#1 (same as a true final), but the champion must NOT be
				// crowned yet — the reset match (GF#2, created above) decides it.
				if match.NextMatchID == nil && match.LoserNextMatchID == nil && !isGrandFinalReset {
					if err := s.tournamentSvc.SetChampion(ctx, match.TournamentID, winnerID); err != nil {
						slog.Error("failed to auto-set tournament champion", "tournament_id", match.TournamentID, "winner_id", winnerID, "error", err)
					}
				}
			case "round_robin":
				allMatches, mErr := s.bracketRepo.ListByTournament(ctx, match.TournamentID)
				if mErr != nil {
					slog.Error("failed to list matches for round_robin champion check", "tournament_id", match.TournamentID, "error", mErr)
					break
				}
				allCompleted := true
				for _, m := range allMatches {
					if m.Status != "completed" {
						allCompleted = false
						break
					}
				}
				if allCompleted && s.standingsRepo != nil {
					if err := s.standingsRepo.UpdateRankPositions(ctx, match.TournamentID, nil); err != nil {
						slog.Error("failed to update rank positions for round_robin champion", "tournament_id", match.TournamentID, "error", err)
						break
					}
					standings, sErr := s.standingsRepo.ListByTournament(ctx, match.TournamentID)
					if sErr != nil {
						slog.Error("failed to list standings for round_robin champion", "tournament_id", match.TournamentID, "error", sErr)
						break
					}
					for _, st := range standings {
						if st.RankPosition != nil && *st.RankPosition == 1 {
							if err := s.tournamentSvc.SetChampion(ctx, match.TournamentID, st.TeamID); err != nil {
								slog.Error("failed to auto-set tournament champion", "tournament_id", match.TournamentID, "winner_id", st.TeamID, "error", err)
							}
							break
						}
					}
				}
				// Other formats (group_stage_playoff/swiss/multi_stage/battle_royale_points)
				// don't reach this elimination auto-champion rule in normal flow; leave
				// their behavior unchanged.
			}
		}
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

	s.broadcastMatchUpdate(match.TournamentID, matchID, "bracket_update", map[string]interface{}{
		"tournament_id": match.TournamentID.String(),
		"match_id":      matchID.String(),
		"action":        "scheduled",
	})

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

	if count > 0 {
		s.broadcastMatchUpdate(tournamentID, tournamentID, "bracket_update", map[string]interface{}{
			"tournament_id": tournamentID.String(),
			"action":        "round_scheduled",
			"round":         round,
		})
	}

	return count, nil
}

// SwapBracketTeams swaps two teams between their pending bracket match slots.
// Both teams must currently be in a pending or scheduled match in this tournament.
// Also swaps their seeds in tournament_teams for display consistency.
func (s *BracketService) SwapBracketTeams(ctx context.Context, tournamentID, teamAID, teamBID uuid.UUID) error {
	if teamAID == teamBID {
		return apperror.BusinessRule("SAME_TEAM", "Tidak bisa menukar tim dengan dirinya sendiri")
	}

	matches, err := s.bracketRepo.ListByTournament(ctx, tournamentID)
	if err != nil {
		return apperror.Wrap(err, "list bracket matches")
	}

	var matchA, matchB *model.BracketMatch
	var posA, posB string // "a" or "b"

	for _, m := range matches {
		if m.Status != "pending" && m.Status != "scheduled" {
			continue
		}
		if m.TeamAID != nil && *m.TeamAID == teamAID {
			matchA = m
			posA = "a"
		} else if m.TeamBID != nil && *m.TeamBID == teamAID {
			matchA = m
			posA = "b"
		}
		if m.TeamAID != nil && *m.TeamAID == teamBID {
			matchB = m
			posB = "a"
		} else if m.TeamBID != nil && *m.TeamBID == teamBID {
			matchB = m
			posB = "b"
		}
	}

	if matchA == nil {
		return apperror.BusinessRule("TEAM_NOT_IN_BRACKET", "Tim A tidak ditemukan di bracket atau sudah bermain")
	}
	if matchB == nil {
		return apperror.BusinessRule("TEAM_NOT_IN_BRACKET", "Tim B tidak ditemukan di bracket atau sudah bermain")
	}

	// Swap team slots
	if posA == "a" {
		matchA.TeamAID = &teamBID
	} else {
		matchA.TeamBID = &teamBID
	}
	if posB == "a" {
		matchB.TeamAID = &teamAID
	} else {
		matchB.TeamBID = &teamAID
	}

	if matchA.ID == matchB.ID {
		// Same match: just one update needed
		if err := s.bracketRepo.Update(ctx, matchA); err != nil {
			return apperror.Wrap(err, "update match")
		}
	} else {
		if err := s.bracketRepo.Update(ctx, matchA); err != nil {
			return apperror.Wrap(err, "update match A")
		}
		if err := s.bracketRepo.Update(ctx, matchB); err != nil {
			return apperror.Wrap(err, "update match B")
		}
	}

	// Swap seeds in tournament_teams for display consistency
	ttA, err := s.ttRepo.FindByTournamentAndTeam(ctx, tournamentID, teamAID)
	if err == nil && ttA != nil {
		ttB, err := s.ttRepo.FindByTournamentAndTeam(ctx, tournamentID, teamBID)
		if err == nil && ttB != nil {
			_ = s.ttRepo.UpdateSeed(ctx, tournamentID, teamAID, ttB.Seed)
			_ = s.ttRepo.UpdateSeed(ctx, tournamentID, teamBID, ttA.Seed)
		}
	}

	s.broadcastMatchUpdate(tournamentID, tournamentID, "bracket_update", map[string]interface{}{
		"tournament_id": tournamentID.String(),
		"action":        "teams_swapped",
	})

	return nil
}

// UpdateMatchBestOf updates the best_of value for a single match.
func (s *BracketService) UpdateMatchBestOf(ctx context.Context, matchID uuid.UUID, bestOf int) error {
	if bestOf < 1 {
		return apperror.BusinessRule("INVALID_BEST_OF", "Best of harus minimal 1")
	}
	if bestOf%2 == 0 {
		return apperror.BusinessRule("INVALID_BEST_OF", "Best of harus bilangan ganjil (1, 3, 5, 7)")
	}

	match, err := s.bracketRepo.FindByID(ctx, matchID)
	if err != nil {
		return apperror.Wrap(err, "find match")
	}
	if err := s.bracketRepo.UpdateBestOf(ctx, matchID, bestOf); err != nil {
		return apperror.Wrap(err, "update match best_of")
	}

	s.broadcastMatchUpdate(match.TournamentID, matchID, "bracket_update", map[string]interface{}{
		"tournament_id": match.TournamentID.String(),
		"match_id":      matchID.String(),
		"action":        "best_of_changed",
		"best_of":       bestOf,
	})

	return nil
}

// UpdateBestOfByRound batch-updates the best_of value for all matches in a given
// tournament round. Returns the number of rows affected.
func (s *BracketService) UpdateBestOfByRound(ctx context.Context, tournamentID uuid.UUID, round int, bestOf int) (int64, error) {
	n, err := s.bracketRepo.UpdateBestOfByTournamentAndRound(ctx, tournamentID, round, bestOf)
	if err != nil {
		return n, apperror.Wrap(err, "update round best_of")
	}

	if n > 0 {
		s.broadcastMatchUpdate(tournamentID, tournamentID, "bracket_update", map[string]interface{}{
			"tournament_id": tournamentID.String(),
			"action":        "best_of_changed",
			"round":         round,
			"best_of":       bestOf,
		})
	}

	return n, nil
}
