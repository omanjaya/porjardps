package service

import (
	"context"
	"log/slog"
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

	// Apply seeding
	if manualSeeds == nil {
		manualSeeds = make(map[uuid.UUID]int)
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

	default:
		// Default: single_elimination
		entries = bracket.PadToPowerOfTwo(entries)
		matches, rounds = bracket.GenerateSingleElimination(tournamentID, entries)
	}

	// Bulk create: first pass — insert all matches without next_match references
	for _, m := range matches {
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
	return nil
}

// advanceWinner places the winner into the next match slot.
func (s *BracketService) advanceWinner(ctx context.Context, match *model.BracketMatch, winnerID uuid.UUID) {
	if match.NextMatchID == nil {
		return
	}

	nextMatch, err := s.bracketRepo.FindByID(ctx, *match.NextMatchID)
	if err != nil || nextMatch == nil {
		slog.Error("failed to find next match for advancement", "next_match_id", match.NextMatchID, "error", err)
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
		slog.Error("failed to advance winner to next match", "error", err)
	}
}
