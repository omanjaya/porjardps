package service

import (
	"context"
	"log/slog"
	"sort"
	"time"

	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/bracket"
)

// GenerateBracket creates the single elimination bracket for a tournament.
func (s *BracketService) GenerateBracket(ctx context.Context, tournamentID uuid.UUID, manualSeeds map[uuid.UUID]int) (matchesCreated int, totalRounds int, err error) {
	// Validate tournament exists and is ongoing
	tournament, err := s.tournamentRepo.FindByID(ctx, tournamentID)
	if err != nil || tournament == nil {
		return 0, 0, apperror.NotFound("TOURNAMENT")
	}
	if tournament.Status != "ongoing" && tournament.Status != "active" {
		return 0, 0, apperror.BusinessRule("INVALID_TOURNAMENT_STATUS", "Turnamen harus berstatus ongoing untuk generate bracket")
	}

	// Check no existing bracket
	existing, err := s.bracketRepo.ListByTournament(ctx, tournamentID)
	if err != nil {
		return 0, 0, apperror.Wrap(err, "check existing bracket")
	}
	if len(existing) > 0 {
		return 0, 0, apperror.Conflict("BRACKET_ALREADY_GENERATED", "Bracket sudah pernah di-generate untuk turnamen ini")
	}

	// Get approved teams
	teams, err := s.ttRepo.ListApprovedTeams(ctx, tournamentID)
	if err != nil {
		return 0, 0, apperror.Wrap(err, "list approved teams")
	}
	if len(teams) < 2 {
		return 0, 0, apperror.BusinessRule("INSUFFICIENT_TEAMS", "Minimal 2 tim yang approved untuk generate bracket")
	}

	// Collect team IDs
	teamIDs := make([]uuid.UUID, len(teams))
	for i, t := range teams {
		teamIDs[i] = t.ID
	}

	// Apply seeding — merge stored seeds from tournament_teams with explicit manual seeds.
	// Explicit manualSeeds (from API request) take priority over stored seeds.
	if manualSeeds == nil {
		manualSeeds = make(map[uuid.UUID]int)
	}
	ttList, ttErr := s.ttRepo.ListByTournament(ctx, tournamentID)
	if ttErr == nil {
		for _, tt := range ttList {
			if tt.Seed != nil {
				if _, exists := manualSeeds[tt.TeamID]; !exists {
					manualSeeds[tt.TeamID] = *tt.Seed
				}
			}
		}
	}
	entries := bracket.ApplySeeding(teamIDs, manualSeeds)

	var matches []*model.BracketMatch
	var rounds int

	switch tournament.Format {
	case "double_elimination":
		// Pad to power of 2 for elimination brackets
		entries = bracket.PadToPowerOfTwo(entries)

		var genErr error
		matches, rounds, genErr = bracket.GenerateDoubleElimination(tournamentID, entries)
		if genErr != nil {
			return 0, 0, apperror.Wrap(genErr, "generate double elimination bracket")
		}

	case "round_robin":
		var genErr error
		matches, rounds, genErr = bracket.GenerateRoundRobin(tournamentID, entries)
		if genErr != nil {
			return 0, 0, apperror.Wrap(genErr, "generate round robin schedule")
		}

	case "single_elimination":
		entries = bracket.PadToPowerOfTwo(entries)
		matches, rounds = bracket.GenerateSingleElimination(tournamentID, entries)

	case "group_stage_playoff", "swiss", "multi_stage":
		return 0, 0, apperror.BusinessRule("INVALID_FORMAT_FOR_BRACKET", "Format ini tidak menggunakan generate-bracket (gunakan grup/stage/swiss)")

	default:
		return 0, 0, apperror.BusinessRule("INVALID_FORMAT_FOR_BRACKET", "Format ini tidak menggunakan generate-bracket (gunakan grup/stage/swiss)")
	}

	// Bulk create: first pass — insert all matches without next_match references
	for _, m := range matches {
		if m.BestOf <= 0 && tournament.BestOf > 0 {
			m.BestOf = tournament.BestOf
		}
		savedNext := m.NextMatchID
		savedLoserNext := m.LoserNextMatchID
		m.NextMatchID = nil
		m.LoserNextMatchID = nil
		if err := s.bracketRepo.Create(ctx, m); err != nil {
			return 0, 0, apperror.Wrap(err, "create bracket match")
		}
		m.NextMatchID = savedNext
		m.LoserNextMatchID = savedLoserNext
	}

	// Second pass — update next_match references now that all matches exist
	for i, m := range matches {
		if m.NextMatchID != nil || m.LoserNextMatchID != nil {
			if err := s.bracketRepo.Update(ctx, m); err != nil {
				slog.Error("error updating match refs", "match", i+1, "total", len(matches), "error", err)
				return 0, 0, apperror.Wrap(err, "update bracket match references")
			}
		}
	}
	slog.Info("bracket created", "matches", len(matches), "rounds", rounds)

	// Auto-advance BYE matches (applicable to elimination formats)
	if tournament.Format != "round_robin" {
		byeIndices := bracket.FindBYEMatches(matches)
		for _, idx := range byeIndices {
			m := matches[idx]
			var winnerID *uuid.UUID
			if m.TeamAID != nil && m.TeamBID == nil {
				winnerID = m.TeamAID
			} else if m.TeamBID != nil && m.TeamAID == nil {
				winnerID = m.TeamBID
			}
			if winnerID != nil {
				// Complete the BYE match — set status to bye, no loser
				m.WinnerID = winnerID
				m.Status = "bye"
				now := time.Now()
				m.CompletedAt = &now
				if err := s.bracketRepo.Update(ctx, m); err != nil {
					slog.Error("error auto-advancing BYE match", "index", idx, "error", err)
					return 0, 0, apperror.Wrap(err, "auto-advance BYE match")
				}

				// Advance winner to next match
				if m.NextMatchID != nil {
					s.advanceWinner(ctx, m, *winnerID)
				}
			}
		}
	}

	// Auto-advance LB matches that will NEVER receive a team because all their feeders are BYEs.
	// A LB match is safe to auto-advance (as empty bye) only if:
	//   (a) it has 0 teams, AND
	//   (b) no real (non-BYE) WR match will ever drop a loser into it, AND
	//   (c) no real (non-BYE) LB match will ever advance a winner into it.
	// Any LB match with at least one real feeder is left alone — teams arrive when those matches complete.
	if tournament.Format == "double_elimination" {
		// Build: LB match ID → count of real feeders that will eventually deliver a team.
		// Use a counter (not bool) so we can decrement when an LB match turns into an
		// empty bye and will never produce a winner for its downstream match.
		realFeederCount := make(map[uuid.UUID]int)
		for _, m := range matches {
			if m.Status == "bye" {
				continue
			}
			// WR match → LB via loser_next_match_id
			if m.LoserNextMatchID != nil {
				realFeederCount[*m.LoserNextMatchID]++
			}
			// LB match → next LB via next_match_id (non-BYE LB produces a winner)
			if m.BracketPosition != nil && *m.BracketPosition == "losers" && m.NextMatchID != nil {
				realFeederCount[*m.NextMatchID]++
			}
		}

		lbMatches := make([]*model.BracketMatch, 0)
		for _, m := range matches {
			if m.BracketPosition != nil && *m.BracketPosition == "losers" {
				lbMatches = append(lbMatches, m)
			}
		}
		sort.Slice(lbMatches, func(i, j int) bool {
			if lbMatches[i].Round != lbMatches[j].Round {
				return lbMatches[i].Round < lbMatches[j].Round
			}
			return lbMatches[i].MatchNumber < lbMatches[j].MatchNumber
		})

		now := time.Now()
		for _, m := range lbMatches {
			if realFeederCount[m.ID] > 0 {
				continue // a real match will feed this slot eventually — leave it alone
			}
			// Re-fetch to confirm current state
			cur, err := s.bracketRepo.FindByID(ctx, m.ID)
			if err != nil || cur == nil || cur.Status != "pending" {
				continue
			}
			if cur.TeamAID != nil && cur.TeamBID != nil {
				continue // two teams — normal match
			}

			cur.Status = "bye"
			cur.CompletedAt = &now
			if cur.TeamAID != nil {
				cur.WinnerID = cur.TeamAID
			} else if cur.TeamBID != nil {
				cur.WinnerID = cur.TeamBID
			}
			// 0 teams: WinnerID stays nil — empty bye, no advancement

			if err := s.bracketRepo.Update(ctx, cur); err != nil {
				slog.Error("failed to mark empty LB match as bye", "id", cur.ID, "error", err)
				continue
			}

			// This match won't produce a winner → decrement its downstream match's
			// feeder count so cascading empty BYEs propagate correctly.
			if cur.WinnerID == nil && cur.NextMatchID != nil {
				realFeederCount[*cur.NextMatchID]--
			}

			if cur.WinnerID != nil && cur.NextMatchID != nil {
				s.advanceWinner(ctx, cur, *cur.WinnerID)
			}
		}
	}

	s.broadcastMatchUpdate(tournamentID, tournamentID, "bracket_update", map[string]interface{}{
		"tournament_id": tournamentID.String(),
		"action":        "generated",
	})

	return len(matches), rounds, nil
}

// ResetBracket deletes all matches for a tournament (for re-generation).
func (s *BracketService) ResetBracket(ctx context.Context, tournamentID uuid.UUID) error {
	matches, err := s.bracketRepo.ListByTournament(ctx, tournamentID)
	if err != nil {
		return apperror.Wrap(err, "list tournament matches")
	}
	for _, m := range matches {
		if err := s.bracketRepo.Delete(ctx, m.ID); err != nil {
			return apperror.Wrap(err, "delete match")
		}
	}

	s.broadcastMatchUpdate(tournamentID, tournamentID, "bracket_update", map[string]interface{}{
		"tournament_id": tournamentID.String(),
		"action":        "reset",
	})

	return nil
}

// ResetResults clears all match results, submissions, and standings for a tournament
// while preserving the bracket structure and round-1 seeding.
// Bye matches are re-advanced after the reset so round-2 slots are correctly pre-filled.
func (s *BracketService) ResetResults(ctx context.Context, tournamentID uuid.UUID) error {
	if err := s.bracketRepo.ResetResultsByTournament(ctx, tournamentID); err != nil {
		return apperror.Wrap(err, "reset bracket results")
	}

	// Re-advance bye match winners so round-2+ slots are filled again.
	matches, err := s.bracketRepo.ListByTournament(ctx, tournamentID)
	if err != nil {
		return apperror.Wrap(err, "list matches after reset")
	}

	// Delete any dynamically-created grand final reset match (double elimination).
	// It has no upstream NextMatchID linkage — it's created on-demand by
	// CompleteMatch only when the losers bracket finalist wins the first grand
	// final — so the generic clear above (round > 1) empties its team slots but
	// leaves it permanently orphaned (nothing will ever repopulate it). Deleting
	// it here is safe: CompleteMatch recreates it if the same scenario recurs.
	for _, m := range matches {
		if m.BracketPosition != nil && *m.BracketPosition == bracket.BracketPositionGrandFinalReset {
			if err := s.bracketRepo.Delete(ctx, m.ID); err != nil {
				slog.Error("failed to delete stale grand final reset match", "match_id", m.ID, "error", err)
			}
		}
	}

	for _, m := range matches {
		if m.Status == "bye" && m.WinnerID != nil && m.NextMatchID != nil {
			s.advanceWinner(ctx, m, *m.WinnerID)
		}
	}

	s.broadcastMatchUpdate(tournamentID, tournamentID, "bracket_update", map[string]interface{}{
		"tournament_id": tournamentID.String(),
		"action":        "results_reset",
	})

	return nil
}

// advanceToLosers places a losers-bracket-bound team (loser from winners bracket) into the
// designated losers bracket match via LoserNextMatchID.
func (s *BracketService) advanceToLosers(ctx context.Context, match *model.BracketMatch, loserID uuid.UUID) {
	if match.LoserNextMatchID == nil {
		return
	}

	nextMatch, err := s.bracketRepo.FindByID(ctx, *match.LoserNextMatchID)
	if err != nil || nextMatch == nil {
		slog.Error("CRITICAL: failed to find losers bracket match for loser advancement", "loser_next_match_id", match.LoserNextMatchID, "match_id", match.ID, "error", err)
		return
	}

	// Idempotency check: skip if team is already assigned to either slot (prevents self-match)
	if nextMatch.TeamAID != nil && *nextMatch.TeamAID == loserID {
		slog.Warn("advanceToLosers: team already assigned to TeamA, skipping", "match_id", nextMatch.ID, "team_id", loserID)
		return
	}
	if nextMatch.TeamBID != nil && *nextMatch.TeamBID == loserID {
		slog.Warn("advanceToLosers: team already assigned to TeamB, skipping", "match_id", nextMatch.ID, "team_id", loserID)
		return
	}

	if nextMatch.TeamAID == nil {
		nextMatch.TeamAID = &loserID
	} else if nextMatch.TeamBID == nil {
		nextMatch.TeamBID = &loserID
	}

	if err := s.bracketRepo.Update(ctx, nextMatch); err != nil {
		slog.Error("CRITICAL: failed to advance loser to losers bracket match", "match_id", nextMatch.ID, "team_id", loserID, "error", err)
		return
	}

	// If the LB match now has exactly one team, it might need auto-advancing as a bye
	// (when the other slot was a WR BYE and will never be filled).
	// But NOT if there is a pending LB match that will eventually advance its winner here —
	// that means this is a real match and the second team is still on its way.
	nextMatch, err = s.bracketRepo.FindByID(ctx, nextMatch.ID)
	if err != nil || nextMatch == nil || nextMatch.Status != "pending" {
		return
	}
	var singleTeam *uuid.UUID
	if nextMatch.TeamAID != nil && nextMatch.TeamBID == nil {
		singleTeam = nextMatch.TeamAID
	} else if nextMatch.TeamBID != nil && nextMatch.TeamAID == nil {
		singleTeam = nextMatch.TeamBID
	}
	if singleTeam == nil {
		return
	}

	// Guard: check for any non-completed match whose winner will feed into this slot.
	// We check:
	// (a) LB matches whose NextMatchID points here (winner advances from losers bracket)
	// (b) WR/LB matches whose LoserNextMatchID points here (loser drops in, but only if
	//     the match is different from the one currently being processed)
	// Any non-completed/non-bye feeder means a team may still arrive — don't auto-advance.
	allMatches, listErr := s.bracketRepo.ListByTournament(ctx, match.TournamentID)
	if listErr == nil {
		for _, m := range allMatches {
			if m.Status == "completed" || m.Status == "bye" {
				continue
			}
			// LB match whose winner will advance here
			if m.BracketPosition != nil && *m.BracketPosition == "losers" &&
				m.NextMatchID != nil && *m.NextMatchID == nextMatch.ID {
				return
			}
			// Any match whose loser will drop here (skip the current match itself)
			if m.LoserNextMatchID != nil && *m.LoserNextMatchID == nextMatch.ID && m.ID != match.ID {
				return
			}
		}
	}

	now := time.Now()
	nextMatch.Status = "bye"
	nextMatch.WinnerID = singleTeam
	nextMatch.CompletedAt = &now
	if err := s.bracketRepo.Update(ctx, nextMatch); err != nil {
		slog.Error("CRITICAL: failed to auto-advance single-team LB match", "match_id", nextMatch.ID, "team_id", *singleTeam, "error", err)
		return
	}
	if nextMatch.NextMatchID != nil {
		s.advanceWinner(ctx, nextMatch, *singleTeam)
	}
}

// createGrandFinalReset creates the deciding "bracket reset" match (GF#2) after a
// double elimination grand final (GF#1) is won by the losers-bracket finalist.
// Both entrants replay: gf1WinnerID (the LB finalist, who just won GF#1) vs
// gf1LoserID (the WB finalist, now on their first loss). The winner of this
// match is the tournament champion — see CompleteMatch's champion auto-set
// switch, which crowns unconditionally once this match's NextMatchID and
// LoserNextMatchID (both nil, like any true final) are checked.
//
// Idempotent: if a reset match already exists for this tournament (e.g. a
// retried request), it is left untouched instead of duplicated.
func (s *BracketService) createGrandFinalReset(ctx context.Context, gf1 *model.BracketMatch, gf1WinnerID, gf1LoserID uuid.UUID) error {
	existing, err := s.bracketRepo.ListByTournament(ctx, gf1.TournamentID)
	if err != nil {
		return apperror.Wrap(err, "list tournament matches")
	}
	for _, m := range existing {
		if m.BracketPosition != nil && *m.BracketPosition == bracket.BracketPositionGrandFinalReset {
			return nil
		}
	}

	pos := bracket.BracketPositionGrandFinalReset
	reset := &model.BracketMatch{
		ID:              uuid.New(),
		TournamentID:    gf1.TournamentID,
		Round:           gf1.Round + 1,
		MatchNumber:     1,
		BracketPosition: &pos,
		TeamAID:         &gf1WinnerID,
		TeamBID:         &gf1LoserID,
		Status:          "pending",
		BestOf:          gf1.BestOf,
	}

	if err := s.bracketRepo.Create(ctx, reset); err != nil {
		return apperror.Wrap(err, "create grand final reset match")
	}

	s.broadcastMatchUpdate(gf1.TournamentID, reset.ID, "bracket_update", map[string]interface{}{
		"tournament_id": gf1.TournamentID.String(),
		"action":        "grand_final_reset_created",
		"match_id":      reset.ID.String(),
	})

	return nil
}

// advanceWinner places the winner into the next match slot.
func (s *BracketService) advanceWinner(ctx context.Context, match *model.BracketMatch, winnerID uuid.UUID) {
	if match.NextMatchID == nil {
		return
	}

	nextMatch, err := s.bracketRepo.FindByID(ctx, *match.NextMatchID)
	if err != nil || nextMatch == nil {
		slog.Error("CRITICAL: failed to find next match for advancement", "next_match_id", match.NextMatchID, "match_id", match.ID, "error", err)
		return
	}

	// Idempotency check: skip if team is already assigned to either slot (prevents self-match)
	if nextMatch.TeamAID != nil && *nextMatch.TeamAID == winnerID {
		slog.Warn("advanceWinner: team already assigned to TeamA, skipping", "match_id", nextMatch.ID, "team_id", winnerID)
		return
	}
	if nextMatch.TeamBID != nil && *nextMatch.TeamBID == winnerID {
		slog.Warn("advanceWinner: team already assigned to TeamB, skipping", "match_id", nextMatch.ID, "team_id", winnerID)
		return
	}

	// Place winner in the next match. The match_number determines position:
	// odd match_number feeder -> team_a, even match_number feeder -> team_b
	if nextMatch.TeamAID == nil {
		nextMatch.TeamAID = &winnerID
	} else if nextMatch.TeamBID == nil {
		nextMatch.TeamBID = &winnerID
	}

	if err := s.bracketRepo.Update(ctx, nextMatch); err != nil {
		slog.Error("CRITICAL: failed to advance winner to next match", "match_id", nextMatch.ID, "team_id", winnerID, "error", err)
	}
}
