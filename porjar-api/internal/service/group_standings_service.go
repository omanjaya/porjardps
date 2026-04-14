package service

import (
	"context"
	"fmt"
	"log/slog"
	"sort"
	"time"

	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
)

// GetGroupStandings returns sorted standings with tiebreaker logic.
func (s *GroupService) GetGroupStandings(ctx context.Context, groupID uuid.UUID) ([]*model.GroupStanding, error) {
	standings, err := s.groupRepo.FindStandingsByGroup(ctx, groupID)
	if err != nil {
		return nil, apperror.Wrap(err, "get standings")
	}

	// Enrich with team data
	for _, st := range standings {
		team, err := s.teamRepo.FindByID(ctx, st.TeamID)
		if err != nil || team == nil {
			continue
		}
		st.Team = &model.TeamSummary{
			ID:   team.ID,
			Name: team.Name,
			Seed: team.Seed,
		}
	}

	return standings, nil
}

// GetAllGroupStandings returns the tournament, all groups, and all standings keyed by group ID.
// Used for PDF/CSV export of group standings.
func (s *GroupService) GetAllGroupStandings(ctx context.Context, tournamentID uuid.UUID) (*model.Tournament, []*model.TournamentGroup, map[uuid.UUID][]*model.GroupStanding, error) {
	t, err := s.tournamentRepo.FindByID(ctx, tournamentID)
	if err != nil {
		return nil, nil, nil, apperror.Wrap(err, "find tournament")
	}
	if t == nil {
		return nil, nil, nil, apperror.NotFound("tournament")
	}

	groups, err := s.ListGroups(ctx, tournamentID)
	if err != nil {
		return nil, nil, nil, err
	}

	allStandings := make(map[uuid.UUID][]*model.GroupStanding, len(groups))
	for _, g := range groups {
		standings, err := s.GetGroupStandings(ctx, g.ID)
		if err != nil {
			continue
		}
		allStandings[g.ID] = standings
	}

	return t, groups, allStandings, nil
}

// SetPenaltyPoints sets penalty points for a team in a group, then recalculates standings.
func (s *GroupService) SetPenaltyPoints(ctx context.Context, groupID, teamID uuid.UUID, penaltyPoints int) error {
	g, err := s.groupRepo.FindGroupByID(ctx, groupID)
	if err != nil {
		return apperror.Wrap(err, "find group")
	}
	if g == nil {
		return apperror.NotFound("group")
	}

	if penaltyPoints < 0 {
		return apperror.BusinessRule("INVALID_PENALTY", "Penalty points tidak boleh negatif")
	}

	if err := s.groupRepo.UpdatePenaltyPoints(ctx, groupID, teamID, penaltyPoints); err != nil {
		return apperror.Wrap(err, "update penalty points")
	}

	return s.recalculateStandings(ctx, groupID)
}

// recalculateStandings recomputes all standings from completed matches.
// RecalculateStandings is the public wrapper for recalculateStandings.
func (s *GroupService) RecalculateStandings(ctx context.Context, groupID uuid.UUID) {
	if err := s.recalculateStandings(ctx, groupID); err != nil {
		slog.Error("RecalculateStandings failed", "group_id", groupID, "error", err)
	}
}

func (s *GroupService) recalculateStandings(ctx context.Context, groupID uuid.UUID) error {
	// Acquire Redis lock to prevent concurrent recalculations for the same group
	if s.rdb != nil {
		lockKey := fmt.Sprintf("standings-recalc:%s", groupID.String())
		ok, err := s.rdb.SetNX(ctx, lockKey, "1", 30*time.Second).Result()
		if err != nil {
			slog.Error("recalculateStandings: failed to acquire Redis lock", "group_id", groupID, "error", err)
			// Continue without lock if Redis fails
		} else if !ok {
			return fmt.Errorf("recalculateStandings: concurrent recalculation in progress for group %s", groupID)
		} else {
			defer s.rdb.Del(ctx, lockKey)
		}
	}

	matches, err := s.groupRepo.FindMatchesByGroup(ctx, groupID)
	if err != nil {
		return fmt.Errorf("find matches: %w", err)
	}

	teamIDs, err := s.groupRepo.FindTeamsByGroup(ctx, groupID)
	if err != nil {
		return fmt.Errorf("find teams: %w", err)
	}

	// Read existing penalty_points from DB so we don't lose them during recalculation
	existingStandings, err := s.groupRepo.FindStandingsByGroup(ctx, groupID)
	if err != nil {
		return fmt.Errorf("find existing standings: %w", err)
	}
	penaltyMap := make(map[uuid.UUID]int)
	for _, st := range existingStandings {
		penaltyMap[st.TeamID] = st.PenaltyPoints
	}

	// Build stats map
	stats := make(map[uuid.UUID]*model.GroupStanding)
	for _, tid := range teamIDs {
		stats[tid] = &model.GroupStanding{
			GroupID:       groupID,
			TeamID:        tid,
			PenaltyPoints: penaltyMap[tid],
		}
	}

	// Head-to-head record for tiebreaker
	h2h := make(map[uuid.UUID]map[uuid.UUID]int) // h2h[a][b] = points a earned vs b

	for _, m := range matches {
		if m.Status != "completed" || m.TeamAID == nil {
			continue
		}

		// BYE match — team A gets a free win
		if m.TeamBID == nil {
			if st, ok := stats[*m.TeamAID]; ok {
				st.MatchesPlayed++
				st.Wins++
				st.Points += 3
				st.GoalsFor += m.ScoreA
			}
			continue
		}

		a, b := *m.TeamAID, *m.TeamBID
		sa, sb := stats[a], stats[b]
		if sa == nil || sb == nil {
			continue
		}

		sa.MatchesPlayed++
		sb.MatchesPlayed++
		sa.GoalsFor += m.ScoreA
		sa.GoalsAgainst += m.ScoreB
		sb.GoalsFor += m.ScoreB
		sb.GoalsAgainst += m.ScoreA

		// Init h2h maps
		if h2h[a] == nil {
			h2h[a] = make(map[uuid.UUID]int)
		}
		if h2h[b] == nil {
			h2h[b] = make(map[uuid.UUID]int)
		}

		if m.ScoreA > m.ScoreB {
			sa.Wins++
			sb.Losses++
			sa.Points += 3
			h2h[a][b] += 3
		} else if m.ScoreA < m.ScoreB {
			sb.Wins++
			sa.Losses++
			sb.Points += 3
			h2h[b][a] += 3
		} else {
			sa.Draws++
			sb.Draws++
			sa.Points += 1
			sb.Points += 1
			h2h[a][b] += 1
			h2h[b][a] += 1
		}
	}

	// Calculate goal difference and apply penalty deduction to Points
	for _, st := range stats {
		st.GoalDifference = st.GoalsFor - st.GoalsAgainst
		st.Points = st.Points - st.PenaltyPoints
	}

	// Sort standings: Points desc (already includes penalty deduction) -> GD desc -> GF desc -> H2H
	// NOTE: The H2H tiebreaker below only compares two teams pairwise. For 3+ teams tied on
	// points, GD, and GF, the sort comparator cannot correctly resolve a multi-way H2H
	// (e.g., A beat B, B beat C, C beat A). This is acceptable for most scenarios since
	// exact 3-way ties on points+GD+GF are extremely rare. A proper fix would require
	// extracting tied groups and computing a mini-table among them.
	sorted := make([]*model.GroupStanding, 0, len(stats))
	for _, st := range stats {
		sorted = append(sorted, st)
	}
	sort.SliceStable(sorted, func(i, j int) bool {
		a, b := sorted[i], sorted[j]
		if a.Points != b.Points {
			return a.Points > b.Points
		}
		if a.GoalDifference != b.GoalDifference {
			return a.GoalDifference > b.GoalDifference
		}
		if a.GoalsFor != b.GoalsFor {
			return a.GoalsFor > b.GoalsFor
		}
		// Total wins: breaks most 3-way ties without needing recursive H2H
		if a.Wins != b.Wins {
			return a.Wins > b.Wins
		}
		// Head-to-head: who earned more points against the other
		h2hA := 0
		h2hB := 0
		if h2h[a.TeamID] != nil {
			h2hA = h2h[a.TeamID][b.TeamID]
		}
		if h2h[b.TeamID] != nil {
			h2hB = h2h[b.TeamID][a.TeamID]
		}
		return h2hA > h2hB
	})

	// Assign rank and upsert
	for i, st := range sorted {
		st.RankPosition = i + 1
		if err := s.groupRepo.UpsertStanding(ctx, st); err != nil {
			return fmt.Errorf("upsert standing: %w", err)
		}
	}

	return nil
}
