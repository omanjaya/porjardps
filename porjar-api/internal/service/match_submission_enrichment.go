package service

import (
	"context"
	"log/slog"

	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
)

// EnrichSubmissions converts raw submissions into AdminSubmissionDTOs with display names.
func (s *MatchSubmissionService) EnrichSubmissions(ctx context.Context, subs []*model.MatchSubmission) ([]*model.AdminSubmissionDTO, error) {
	if len(subs) == 0 {
		return []*model.AdminSubmissionDTO{}, nil
	}

	// Collect unique IDs
	teamIDSet := make(map[uuid.UUID]bool)
	userIDSet := make(map[uuid.UUID]bool)
	bracketMatchIDSet := make(map[uuid.UUID]bool)

	for _, sub := range subs {
		teamIDSet[sub.TeamID] = true
		userIDSet[sub.SubmittedBy] = true
		if sub.BracketMatchID != nil {
			bracketMatchIDSet[*sub.BracketMatchID] = true
		}
	}

	// Batch-fetch teams
	teamIDs := make([]uuid.UUID, 0, len(teamIDSet))
	for id := range teamIDSet {
		teamIDs = append(teamIDs, id)
	}
	teams, err := s.teamRepo.FindByIDs(ctx, teamIDs)
	if err != nil {
		slog.Error("EnrichSubmissions: failed to batch-fetch teams", "error", err)
	}
	teamMap := make(map[uuid.UUID]string, len(teams))
	teamGameMap := make(map[uuid.UUID]uuid.UUID, len(teams))
	for _, t := range teams {
		teamMap[t.ID] = t.Name
		teamGameMap[t.ID] = t.GameID
	}

	// Batch-fetch users
	userIDs := make([]uuid.UUID, 0, len(userIDSet))
	for id := range userIDSet {
		userIDs = append(userIDs, id)
	}
	users, err := s.userRepo.FindByIDs(ctx, userIDs)
	if err != nil {
		slog.Error("EnrichSubmissions: failed to batch-fetch users", "error", err)
	}
	userMap := make(map[uuid.UUID]string, len(users))
	for _, u := range users {
		userMap[u.ID] = u.FullName
	}

	// Batch-fetch bracket matches for team_a/team_b names
	bracketMatchIDs := make([]uuid.UUID, 0, len(bracketMatchIDSet))
	for id := range bracketMatchIDSet {
		bracketMatchIDs = append(bracketMatchIDs, id)
	}
	bracketMatches, err := s.bracketRepo.FindByIDs(ctx, bracketMatchIDs)
	if err != nil {
		slog.Error("EnrichSubmissions: failed to batch-fetch bracket matches", "error", err)
	}
	bracketMap := make(map[uuid.UUID]*model.BracketMatch, len(bracketMatches))
	for _, bm := range bracketMatches {
		bracketMap[bm.ID] = bm
		if bm.TeamAID != nil {
			teamIDSet[*bm.TeamAID] = true
		}
		if bm.TeamBID != nil {
			teamIDSet[*bm.TeamBID] = true
		}
	}

	// Re-fetch teams if bracket matches added new team IDs
	if len(teamIDSet) > len(teamIDs) {
		allTeamIDs := make([]uuid.UUID, 0, len(teamIDSet))
		for id := range teamIDSet {
			allTeamIDs = append(allTeamIDs, id)
		}
		allTeams, err := s.teamRepo.FindByIDs(ctx, allTeamIDs)
		if err != nil {
			slog.Error("EnrichSubmissions: failed to re-fetch teams", "error", err)
		}
		for _, t := range allTeams {
			teamMap[t.ID] = t.Name
			teamGameMap[t.ID] = t.GameID
		}
	}

	// Collect game IDs from teams
	gameIDSet := make(map[uuid.UUID]bool)
	for _, gid := range teamGameMap {
		gameIDSet[gid] = true
	}
	gameIDs := make([]uuid.UUID, 0, len(gameIDSet))
	for id := range gameIDSet {
		gameIDs = append(gameIDs, id)
	}
	games, err := s.gameRepo.FindByIDs(ctx, gameIDs)
	if err != nil {
		slog.Error("EnrichSubmissions: failed to batch-fetch games", "error", err)
	}
	gameMap := make(map[uuid.UUID]string, len(games))
	gameSlugMap := make(map[uuid.UUID]string, len(games))
	for _, g := range games {
		gameMap[g.ID] = g.Name
		gameSlugMap[g.ID] = g.Slug
	}

	// Batch-fetch group matches for team_a/team_b names
	groupMatchIDSet := make(map[uuid.UUID]bool)
	for _, sub := range subs {
		if sub.GroupMatchID != nil {
			groupMatchIDSet[*sub.GroupMatchID] = true
		}
	}
	groupMatchMap := make(map[uuid.UUID]*model.GroupMatch)
	if len(groupMatchIDSet) > 0 && s.groupRepo != nil {
		gmIDs := make([]uuid.UUID, 0, len(groupMatchIDSet))
		for id := range groupMatchIDSet {
			gmIDs = append(gmIDs, id)
		}
		groupMatches, err := s.groupRepo.FindMatchByIDs(ctx, gmIDs)
		if err != nil {
			slog.Error("EnrichSubmissions: failed to batch-fetch group matches", "error", err)
		}
		for _, gm := range groupMatches {
			groupMatchMap[gm.ID] = gm
			if gm.TeamAID != nil {
				teamIDSet[*gm.TeamAID] = true
			}
			if gm.TeamBID != nil {
				teamIDSet[*gm.TeamBID] = true
			}
		}
		// Re-fetch teams if group matches added new team IDs
		if len(teamIDSet) > len(teamMap) {
			allTeamIDs := make([]uuid.UUID, 0, len(teamIDSet))
			for id := range teamIDSet {
				allTeamIDs = append(allTeamIDs, id)
			}
			allTeams, err := s.teamRepo.FindByIDs(ctx, allTeamIDs)
			if err != nil {
				slog.Error("EnrichSubmissions: failed to re-fetch teams for group matches", "error", err)
			}
			for _, t := range allTeams {
				teamMap[t.ID] = t.Name
				teamGameMap[t.ID] = t.GameID
			}
		}
	}

	// Build DTOs
	result := make([]*model.AdminSubmissionDTO, len(subs))
	for i, sub := range subs {
		dto := &model.AdminSubmissionDTO{
			MatchSubmission: *sub,
			TeamName:        teamMap[sub.TeamID],
			SubmittedByName: userMap[sub.SubmittedBy],
		}
		// Game name + slug from the submitting team
		if gid, ok := teamGameMap[sub.TeamID]; ok {
			dto.GameName = gameMap[gid]
			dto.GameSlug = gameSlugMap[gid]
		}
		// team_a / team_b from bracket match
		if sub.BracketMatchID != nil {
			if bm, ok := bracketMap[*sub.BracketMatchID]; ok {
				dto.TeamAID = bm.TeamAID
				dto.TeamBID = bm.TeamBID
				if bm.TeamAID != nil {
					dto.TeamAName = teamMap[*bm.TeamAID]
				}
				if bm.TeamBID != nil {
					dto.TeamBName = teamMap[*bm.TeamBID]
				}
			}
		}
		// team_a / team_b from group match
		if sub.GroupMatchID != nil {
			if gm, ok := groupMatchMap[*sub.GroupMatchID]; ok {
				dto.TeamAID = gm.TeamAID
				dto.TeamBID = gm.TeamBID
				if gm.TeamAID != nil {
					dto.TeamAName = teamMap[*gm.TeamAID]
				}
				if gm.TeamBID != nil {
					dto.TeamBName = teamMap[*gm.TeamBID]
				}
			}
		}
		result[i] = dto
	}
	return result, nil
}

// EnrichWithNames adds team_name, claimed_winner_name, and submitter_name to submissions.
func (s *MatchSubmissionService) EnrichWithNames(ctx context.Context, subs []*model.MatchSubmission) []*model.SubmissionWithNames {
	if len(subs) == 0 {
		return []*model.SubmissionWithNames{}
	}

	// Collect unique team IDs and user IDs
	teamIDSet := make(map[uuid.UUID]struct{})
	userIDSet := make(map[uuid.UUID]struct{})
	for _, sub := range subs {
		teamIDSet[sub.TeamID] = struct{}{}
		userIDSet[sub.SubmittedBy] = struct{}{}
		if sub.ClaimedWinnerID != nil {
			teamIDSet[*sub.ClaimedWinnerID] = struct{}{}
		}
	}

	teamIDs := make([]uuid.UUID, 0, len(teamIDSet))
	for id := range teamIDSet {
		teamIDs = append(teamIDs, id)
	}
	userIDs := make([]uuid.UUID, 0, len(userIDSet))
	for id := range userIDSet {
		userIDs = append(userIDs, id)
	}

	teamMap := make(map[uuid.UUID]string)
	if teams, err := s.teamRepo.FindByIDs(ctx, teamIDs); err == nil {
		for _, t := range teams {
			teamMap[t.ID] = t.Name
		}
	}

	userMap := make(map[uuid.UUID]string)
	if users, err := s.userRepo.FindByIDs(ctx, userIDs); err == nil {
		for _, u := range users {
			userMap[u.ID] = u.FullName
		}
	}

	result := make([]*model.SubmissionWithNames, len(subs))
	for i, sub := range subs {
		dto := &model.SubmissionWithNames{
			MatchSubmission: *sub,
			TeamName:        teamMap[sub.TeamID],
			SubmitterName:   userMap[sub.SubmittedBy],
		}
		if sub.ClaimedWinnerID != nil {
			dto.ClaimedWinnerName = teamMap[*sub.ClaimedWinnerID]
		}
		result[i] = dto
	}
	return result
}
