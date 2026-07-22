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

		if m.ScoreA > m.ScoreB {
			sa.Wins++
			sb.Losses++
			sa.Points += 3
		} else if m.ScoreA < m.ScoreB {
			sb.Wins++
			sa.Losses++
			sb.Points += 3
		} else {
			sa.Draws++
			sb.Draws++
			sa.Points += 1
			sb.Points += 1
		}
	}

	// Calculate goal difference and apply penalty deduction to Points
	for _, st := range stats {
		st.GoalDifference = st.GoalsFor - st.GoalsAgainst
		st.Points = st.Points - st.PenaltyPoints
	}

	// Sort standings: Points desc (already includes penalty deduction) -> GD desc -> GF desc.
	// Any teams still tied after these primary criteria are resolved by resolveTiedGroup
	// below, which builds a MINI-LEAGUE from only the matches played among the tied teams.
	// A pairwise H2H comparator (the old approach) cannot produce a correct total order for
	// a cyclic 3+-way tie (e.g. A beat B, B beat C, C beat A) — sort.Slice/SliceStable require
	// a transitive "less" function, and pairwise H2H isn't transitive in that case, so the
	// resulting order silently depended on slice/iteration order. The mini-league fixes that
	// by scoring the tied subset as its own self-contained league, and a final stable team-ID
	// key guarantees the overall order is always deterministic even if the mini-league itself
	// is exactly tied (e.g. teams never played each other, or their mutual results cancel out).
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
		return a.GoalsFor > b.GoalsFor
	})

	// Find contiguous runs tied on Points/GD/GF and resolve each run
	// independently with a mini-league (falls back to total wins, then a
	// stable team-ID key so the order is never non-deterministic).
	for i := 0; i < len(sorted); {
		j := i + 1
		for j < len(sorted) &&
			sorted[j].Points == sorted[i].Points &&
			sorted[j].GoalDifference == sorted[i].GoalDifference &&
			sorted[j].GoalsFor == sorted[i].GoalsFor {
			j++
		}
		if j-i > 1 {
			resolveTiedGroup(sorted[i:j], matches)
		}
		i = j
	}

	// Assign rank and upsert
	for i, st := range sorted {
		st.RankPosition = i + 1
		if err := s.groupRepo.UpsertStanding(ctx, st); err != nil {
			return fmt.Errorf("upsert standing: %w", err)
		}
	}

	return nil
}

// miniLeagueStat holds a tied team's record computed using ONLY the matches
// played among the other members of its tied group (points/GD/GF).
type miniLeagueStat struct {
	points int
	gd     int
	gf     int
	ga     int
}

// resolveTiedGroup re-sorts a slice of standings that are already known to be
// tied on Points/GoalDifference/GoalsFor, in place, using a mini-league among
// only those tied teams. This correctly handles cyclic 3+-way ties (e.g. A
// beat B, B beat C, C beat A) that a pairwise head-to-head comparator cannot,
// since sort comparators require a transitive ordering and pairwise H2H isn't
// transitive in a cyclic tie.
//
// Resolution order:
//  1. Mini-league points (3/1/0 from matches played strictly within the tied
//     group), then mini-league goal difference, then mini-league goals for —
//     i.e. the standard standings criteria, but scoped to the tied subset.
//  2. If still tied (e.g. the tied teams never played each other, or their
//     results within the group also cancel out), total wins across all
//     matches in the group.
//  3. If still tied, team ID as a final stable, deterministic key so the
//     order can never depend on map/slice iteration order or be effectively
//     random.
func resolveTiedGroup(tied []*model.GroupStanding, matches []*model.GroupMatch) {
	inGroup := make(map[uuid.UUID]bool, len(tied))
	for _, st := range tied {
		inGroup[st.TeamID] = true
	}

	mini := make(map[uuid.UUID]*miniLeagueStat, len(tied))
	for _, st := range tied {
		mini[st.TeamID] = &miniLeagueStat{}
	}

	for _, m := range matches {
		if m.Status != "completed" || m.TeamAID == nil || m.TeamBID == nil {
			continue // BYE matches involve only one team and carry no head-to-head info
		}
		a, b := *m.TeamAID, *m.TeamBID
		if !inGroup[a] || !inGroup[b] {
			continue // only matches played between two members of the tied group count
		}

		ma, mb := mini[a], mini[b]
		ma.gf += m.ScoreA
		ma.ga += m.ScoreB
		mb.gf += m.ScoreB
		mb.ga += m.ScoreA

		if m.ScoreA > m.ScoreB {
			ma.points += 3
		} else if m.ScoreA < m.ScoreB {
			mb.points += 3
		} else {
			ma.points++
			mb.points++
		}
	}
	for _, st := range mini {
		st.gd = st.gf - st.ga
	}

	sort.SliceStable(tied, func(i, j int) bool {
		a, b := tied[i], tied[j]
		ma, mb := mini[a.TeamID], mini[b.TeamID]

		if ma.points != mb.points {
			return ma.points > mb.points
		}
		if ma.gd != mb.gd {
			return ma.gd > mb.gd
		}
		if ma.gf != mb.gf {
			return ma.gf > mb.gf
		}
		if a.Wins != b.Wins {
			return a.Wins > b.Wins
		}
		// Final deterministic fallback: stable team-ID ordering. This never
		// changes between recalculations, so qualification/seeding order is
		// always reproducible even in a fully-symmetric N-way tie.
		return a.TeamID.String() < b.TeamID.String()
	})
}
