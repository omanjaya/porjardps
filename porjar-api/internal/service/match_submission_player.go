package service

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
)

// ActiveMatchDTO is a unified view of a match/lobby where a player can submit results.
type ActiveMatchDTO struct {
	ID          string     `json:"id"`
	Type        string     `json:"type"`
	TeamAName   string     `json:"team_a_name"`
	TeamBName   string     `json:"team_b_name"`
	GameName    string     `json:"game_name"`
	GameSlug    string     `json:"game_slug"`
	BestOf      *int       `json:"best_of"`
	LobbyName   *string    `json:"lobby_name"`
	ScheduledAt *time.Time `json:"scheduled_at"`
}

// GetPlayerActiveMatches returns bracket matches and BR lobbies where the player's team(s) can submit results.
func (s *MatchSubmissionService) GetPlayerActiveMatches(ctx context.Context, userID uuid.UUID) ([]*ActiveMatchDTO, error) {
	// Step 1: fetch only the memberships that belong to this user (avoids listing all teams)
	memberships, err := s.teamMemberRepo.FindByUser(ctx, userID)
	if err != nil {
		return nil, apperror.Wrap(err, "find user memberships")
	}
	if len(memberships) == 0 {
		return []*ActiveMatchDTO{}, nil
	}

	// Collect the team IDs the user belongs to
	teamIDs := make([]uuid.UUID, 0, len(memberships))
	for _, m := range memberships {
		teamIDs = append(teamIDs, m.TeamID)
	}

	// Step 2: batch-fetch all of the user's teams in one query
	userTeams, err := s.teamRepo.FindByIDs(ctx, teamIDs)
	if err != nil {
		return nil, apperror.Wrap(err, "find teams by ids")
	}

	// Step 3: collect unique game IDs and batch-fetch games
	gameIDSet := make(map[uuid.UUID]struct{}, len(userTeams))
	for _, t := range userTeams {
		gameIDSet[t.GameID] = struct{}{}
	}
	gameIDList := make([]uuid.UUID, 0, len(gameIDSet))
	for id := range gameIDSet {
		gameIDList = append(gameIDList, id)
	}
	gamesList, _ := s.gameRepo.FindByIDs(ctx, gameIDList)
	gameMap := make(map[uuid.UUID]*model.Game, len(gamesList))
	for _, g := range gamesList {
		gameMap[g.ID] = g
	}

	// Step 4: build a map of team by ID for quick look-up (used for bracket opponent names)
	teamByID := make(map[uuid.UUID]*model.Team, len(userTeams))
	for _, t := range userTeams {
		teamByID[t.ID] = t
	}

	// Step 5: gather all bracket matches for all the user's teams, then collect
	// all opponent team IDs so we can batch-fetch names in one shot.
	type bracketEntry struct {
		team *model.Team
		bm   *model.BracketMatch
	}
	var bracketEntries []bracketEntry
	opponentIDSet := make(map[uuid.UUID]struct{})

	for _, t := range userTeams {
		bracketMatches, _ := s.bracketRepo.ListByTeam(ctx, t.ID)
		for _, bm := range bracketMatches {
			if bm.Status != "live" && bm.Status != "scheduled" {
				continue
			}
			bracketEntries = append(bracketEntries, bracketEntry{team: t, bm: bm})
			if bm.TeamAID != nil {
				if _, known := teamByID[*bm.TeamAID]; !known {
					opponentIDSet[*bm.TeamAID] = struct{}{}
				}
			}
			if bm.TeamBID != nil {
				if _, known := teamByID[*bm.TeamBID]; !known {
					opponentIDSet[*bm.TeamBID] = struct{}{}
				}
			}
		}
	}

	// Batch-fetch opponent teams not already in teamByID
	if len(opponentIDSet) > 0 {
		opponentIDs := make([]uuid.UUID, 0, len(opponentIDSet))
		for id := range opponentIDSet {
			opponentIDs = append(opponentIDs, id)
		}
		opponents, _ := s.teamRepo.FindByIDs(ctx, opponentIDs)
		for _, t := range opponents {
			teamByID[t.ID] = t
		}
	}

	// Step 6: build result
	var result []*ActiveMatchDTO

	for _, entry := range bracketEntries {
		t := entry.team
		bm := entry.bm

		game := gameMap[t.GameID]
		gameName, gameSlug := "", ""
		if game != nil {
			gameName = game.Name
			gameSlug = game.Slug
		}

		teamAName := "TBD"
		teamBName := "TBD"
		if bm.TeamAID != nil {
			if ta := teamByID[*bm.TeamAID]; ta != nil {
				teamAName = ta.Name
			}
		}
		if bm.TeamBID != nil {
			if tb := teamByID[*bm.TeamBID]; tb != nil {
				teamBName = tb.Name
			}
		}
		bestOf := bm.BestOf
		result = append(result, &ActiveMatchDTO{
			ID:          bm.ID.String(),
			Type:        "bracket",
			TeamAName:   teamAName,
			TeamBName:   teamBName,
			GameName:    gameName,
			GameSlug:    gameSlug,
			BestOf:      &bestOf,
			ScheduledAt: bm.ScheduledAt,
		})
	}

	// Step 7: BR lobbies — one FindByTeam per user-team (already minimal; lobby data must be fetched per lobby)
	for _, t := range userTeams {
		game := gameMap[t.GameID]
		gameName, gameSlug := "", ""
		if game != nil {
			gameName = game.Name
			gameSlug = game.Slug
		}

		lobbyTeams, _ := s.brLobbyTeamRepo.FindByTeam(ctx, t.ID)
		for _, lt := range lobbyTeams {
			lobby, err := s.brLobbyRepo.FindByID(ctx, lt.LobbyID)
			if err != nil || lobby == nil {
				continue
			}
			if lobby.Status != "live" && lobby.Status != "scheduled" {
				continue
			}
			result = append(result, &ActiveMatchDTO{
				ID:          lobby.ID.String(),
				Type:        "battle_royale",
				TeamAName:   t.Name,
				TeamBName:   "Battle Royale",
				GameName:    gameName,
				GameSlug:    gameSlug,
				LobbyName:   &lobby.LobbyName,
				ScheduledAt: lobby.ScheduledAt,
			})
		}
	}

	return result, nil
}

// GetPlayerSubmissions returns all submissions for the player's teams.
func (s *MatchSubmissionService) GetPlayerSubmissions(ctx context.Context, userID uuid.UUID) ([]*model.MatchSubmission, error) {
	allTeams, _, err := s.teamRepo.List(ctx, model.TeamFilter{Page: 1, Limit: 200})
	if err != nil {
		return nil, apperror.Wrap(err, "list teams")
	}

	var all []*model.MatchSubmission
	seen := map[uuid.UUID]bool{}
	for _, t := range allTeams {
		member, _ := s.teamMemberRepo.FindByTeamAndUser(ctx, t.ID, userID)
		if member == nil {
			continue
		}
		subs, _ := s.submissionRepo.FindByTeam(ctx, t.ID)
		for _, sub := range subs {
			if !seen[sub.ID] {
				seen[sub.ID] = true
				all = append(all, sub)
			}
		}
	}
	return all, nil
}

// strPtr returns a pointer to the given string.
func strPtr(s string) *string {
	return &s
}
