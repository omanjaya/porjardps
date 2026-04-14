package service

import (
	"context"
	"log/slog"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
)

// GenerateMatches generates round-robin matches for all teams in a group.
// Uses the circle method: fix team[0], rotate the rest.
func (s *GroupService) GenerateMatches(ctx context.Context, groupID uuid.UUID) ([]*model.GroupMatch, error) {
	g, err := s.groupRepo.FindGroupByID(ctx, groupID)
	if err != nil {
		return nil, apperror.Wrap(err, "find group")
	}
	if g == nil {
		return nil, apperror.NotFound("group")
	}

	teamIDs, err := s.groupRepo.FindTeamsByGroup(ctx, groupID)
	if err != nil {
		return nil, apperror.Wrap(err, "find group teams")
	}

	n := len(teamIDs)
	if n < 2 {
		return nil, apperror.BusinessRule("NOT_ENOUGH_TEAMS", "Grup harus memiliki minimal 2 tim")
	}

	// Delete existing matches and standings before regenerating
	if err := s.groupRepo.DeleteMatchesByGroup(ctx, groupID); err != nil {
		return nil, apperror.Wrap(err, "delete existing matches")
	}
	if err := s.groupRepo.DeleteStandingsByGroup(ctx, groupID); err != nil {
		return nil, apperror.Wrap(err, "delete existing standings")
	}

	// For odd number of teams, add a "bye" placeholder (nil)
	teams := make([]*uuid.UUID, n)
	for i := range teamIDs {
		id := teamIDs[i]
		teams[i] = &id
	}
	if n%2 != 0 {
		teams = append(teams, nil) // bye
	}

	totalTeams := len(teams)
	rounds := totalTeams - 1
	matchesPerRound := totalTeams / 2

	var matches []*model.GroupMatch
	matchNum := 1

	for round := 1; round <= rounds; round++ {
		for i := 0; i < matchesPerRound; i++ {
			home := teams[i]
			away := teams[totalTeams-1-i]

			// Skip bye matches
			if home == nil || away == nil {
				continue
			}

			// Alternate home/away each round for balance
			if round%2 == 0 {
				home, away = away, home
			}

			m := &model.GroupMatch{
				GroupID:     groupID,
				Round:       round,
				MatchNumber: matchNum,
				TeamAID:     home,
				TeamBID:     away,
				Status:      "pending",
			}
			if err := s.groupRepo.CreateMatch(ctx, m); err != nil {
				return nil, apperror.Wrap(err, "create match")
			}
			matches = append(matches, m)
			matchNum++
		}

		// Rotate: fix teams[0], rotate the rest clockwise
		last := teams[totalTeams-1]
		copy(teams[2:], teams[1:totalTeams-1])
		teams[1] = last
	}

	// Second leg: same pairings with swapped home/away, rounds continue from leg 1
	if g.Legs >= 2 {
		// Reset teams array for second rotation
		leg2Teams := make([]*uuid.UUID, n)
		for i := range teamIDs {
			id := teamIDs[i]
			leg2Teams[i] = &id
		}
		if n%2 != 0 {
			leg2Teams = append(leg2Teams, nil) // bye
		}

		roundOffset := rounds // leg 1 had this many rounds

		for round := 1; round <= rounds; round++ {
			for i := 0; i < matchesPerRound; i++ {
				home := leg2Teams[i]
				away := leg2Teams[totalTeams-1-i]

				// Skip bye matches
				if home == nil || away == nil {
					continue
				}

				// Leg 2: reverse home/away compared to leg 1.
				// Leg 1 swaps on even rounds (no swap on odd).
				// Leg 2 swaps on odd rounds (no swap on even).
				// This ensures every match has opposite home/away from leg 1.
				if round%2 != 0 {
					home, away = away, home
				}

				m := &model.GroupMatch{
					GroupID:     groupID,
					Round:       round + roundOffset,
					MatchNumber: matchNum,
					TeamAID:     home,
					TeamBID:     away,
					Status:      "pending",
				}
				if err := s.groupRepo.CreateMatch(ctx, m); err != nil {
					return nil, apperror.Wrap(err, "create match")
				}
				matches = append(matches, m)
				matchNum++
			}

			// Rotate: fix leg2Teams[0], rotate the rest clockwise
			last := leg2Teams[totalTeams-1]
			copy(leg2Teams[2:], leg2Teams[1:totalTeams-1])
			leg2Teams[1] = last
		}
	}

	// Initialize standings for all teams
	for _, tid := range teamIDs {
		st := &model.GroupStanding{
			GroupID: groupID,
			TeamID:  tid,
		}
		if err := s.groupRepo.UpsertStanding(ctx, st); err != nil {
			slog.Error("failed to init standing", "error", err)
		}
	}

	s.broadcastGroupUpdate(g.TournamentID, "matches_generated")

	return matches, nil
}

// SubmitMatchResult updates a match score, marks it completed, and recalculates standings.
func (s *GroupService) SubmitMatchResult(ctx context.Context, matchID uuid.UUID, scoreA, scoreB int, scheduledAt *time.Time) (*model.GroupMatch, error) {
	m, err := s.groupRepo.FindMatchByID(ctx, matchID)
	if err != nil {
		return nil, apperror.Wrap(err, "find match")
	}
	if m == nil {
		return nil, apperror.NotFound("match")
	}

	if m.Status == "completed" {
		return nil, apperror.Conflict("MATCH_COMPLETED", "Match sudah selesai")
	}

	// No-draw enforcement for eFootball tournaments
	if scoreA == scoreB && s.gameRepo != nil {
		g, err := s.groupRepo.FindGroupByID(ctx, m.GroupID)
		if err == nil && g != nil {
			t, err := s.tournamentRepo.FindByID(ctx, g.TournamentID)
			if err == nil && t != nil {
				game, err := s.gameRepo.FindByID(ctx, t.GameID)
				if err == nil && game != nil && strings.Contains(strings.ToLower(game.Slug), "efootball") {
					return nil, apperror.BusinessRule("NO_DRAW", "eFootball tidak boleh seri, harus ada pemenang")
				}
			}
		}
	}

	if err := s.groupRepo.UpdateMatchScore(ctx, matchID, scoreA, scoreB, scheduledAt); err != nil {
		return nil, apperror.Wrap(err, "update match score")
	}

	// After setting the match to completed, reject any pending submissions to avoid
	// race conditions where auto-verify runs concurrently with an admin score update.
	if s.submissionRepo != nil {
		if pendingSubs, err := s.submissionRepo.FindPendingByGroupMatch(ctx, matchID); err == nil {
			for _, sub := range pendingSubs {
				_ = s.submissionRepo.UpdateStatus(ctx, sub.ID, "rejected", nil, nil, strPtr("Match diselesaikan oleh admin"))
			}
		}
	}

	// Recalculate standings for this group
	if err := s.recalculateStandings(ctx, m.GroupID); err != nil {
		slog.Error("failed to recalculate standings", "group_id", m.GroupID, "error", err)
	}

	// Broadcast group update
	if grp, err := s.groupRepo.FindGroupByID(ctx, m.GroupID); err == nil && grp != nil {
		s.broadcastGroupUpdate(grp.TournamentID, "match_result_submitted")
	}

	// Return updated match
	return s.groupRepo.FindMatchByID(ctx, matchID)
}

// GetGroupMatches returns all matches for a group enriched with team data.
func (s *GroupService) GetGroupMatches(ctx context.Context, groupID uuid.UUID) ([]*model.GroupMatch, error) {
	matches, err := s.groupRepo.FindMatchesByGroup(ctx, groupID)
	if err != nil {
		return nil, apperror.Wrap(err, "get group matches")
	}

	// Enrich with team data
	for _, m := range matches {
		if m.TeamAID != nil {
			team, err := s.teamRepo.FindByID(ctx, *m.TeamAID)
			if err == nil && team != nil {
				m.TeamA = &model.TeamSummary{ID: team.ID, Name: team.Name, Seed: team.Seed}
			}
		}
		if m.TeamBID != nil {
			team, err := s.teamRepo.FindByID(ctx, *m.TeamBID)
			if err == nil && team != nil {
				m.TeamB = &model.TeamSummary{ID: team.ID, Name: team.Name, Seed: team.Seed}
			}
		}
	}

	return matches, nil
}

// SetMatchLive marks a group match as live.
func (s *GroupService) SetMatchLive(ctx context.Context, matchID uuid.UUID) error {
	m, err := s.groupRepo.FindMatchByID(ctx, matchID)
	if err != nil {
		return apperror.Wrap(err, "find match")
	}
	if m == nil {
		return apperror.NotFound("match")
	}
	if m.Status != "pending" && m.Status != "scheduled" {
		return apperror.BusinessRule("INVALID_STATUS", "Match harus berstatus pending atau scheduled")
	}
	return s.groupRepo.UpdateMatchStatus(ctx, matchID, "live")
}
