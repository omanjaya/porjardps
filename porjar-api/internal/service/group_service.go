package service

import (
	"context"
	"fmt"
	"log/slog"
	"math/rand"

	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
	"github.com/porjar-denpasar/porjar-api/internal/ws"
	"github.com/redis/go-redis/v9"
)

type GroupService struct {
	groupRepo      model.GroupRepository
	tournamentRepo model.TournamentRepository
	ttRepo         model.TournamentTeamRepository
	teamRepo       model.TeamRepository
	bracketRepo    model.BracketRepository
	gameRepo       model.GameRepository
	submissionRepo model.MatchSubmissionRepository
	rdb            *redis.Client
	hub            *ws.Hub
}

func (s *GroupService) SetHub(h *ws.Hub) { s.hub = h }

func (s *GroupService) broadcastGroupUpdate(tournamentID uuid.UUID, action string) {
	if s.hub == nil {
		return
	}
	payload, err := ws.NewBroadcastData("bracket_update", map[string]interface{}{
		"tournament_id": tournamentID.String(),
		"action":        action,
	})
	if err != nil {
		slog.Error("failed to marshal group broadcast", "error", err)
		return
	}
	s.hub.BroadcastToRoom(fmt.Sprintf("tournament:%s", tournamentID.String()), payload)
}

func (s *GroupService) SetBracketRepo(r model.BracketRepository)             { s.bracketRepo = r }
func (s *GroupService) SetGameRepo(r model.GameRepository)                   { s.gameRepo = r }
func (s *GroupService) SetSubmissionRepo(r model.MatchSubmissionRepository)   { s.submissionRepo = r }

func NewGroupService(
	groupRepo model.GroupRepository,
	tournamentRepo model.TournamentRepository,
	ttRepo model.TournamentTeamRepository,
	teamRepo model.TeamRepository,
	rdb *redis.Client,
) *GroupService {
	return &GroupService{
		groupRepo:      groupRepo,
		tournamentRepo: tournamentRepo,
		ttRepo:         ttRepo,
		teamRepo:       teamRepo,
		rdb:            rdb,
	}
}

// CreateGroup creates a new group for a tournament.
func (s *GroupService) CreateGroup(ctx context.Context, tournamentID uuid.UUID, name string, groupOrder, advanceCount, legs int) (*model.TournamentGroup, error) {
	t, err := s.tournamentRepo.FindByID(ctx, tournamentID)
	if err != nil {
		return nil, apperror.Wrap(err, "find tournament")
	}
	if t == nil {
		return nil, apperror.NotFound("tournament")
	}

	if legs <= 0 {
		legs = 1
	}

	g := &model.TournamentGroup{
		TournamentID: tournamentID,
		Name:         name,
		GroupOrder:   groupOrder,
		AdvanceCount: advanceCount,
		Legs:         legs,
	}
	if err := s.groupRepo.CreateGroup(ctx, g); err != nil {
		return nil, apperror.Wrap(err, "create group")
	}
	s.broadcastGroupUpdate(tournamentID, "group_created")
	return g, nil
}

// ListGroups returns all groups for a tournament with teams.
func (s *GroupService) ListGroups(ctx context.Context, tournamentID uuid.UUID) ([]*model.TournamentGroup, error) {
	groups, err := s.groupRepo.FindGroupsByTournament(ctx, tournamentID)
	if err != nil {
		return nil, apperror.Wrap(err, "list groups")
	}

	// Enrich with team data
	for _, g := range groups {
		teamIDs, err := s.groupRepo.FindTeamsByGroup(ctx, g.ID)
		if err != nil {
			slog.Error("failed to load group teams", "group_id", g.ID, "error", err)
			continue
		}
		teams := make([]model.TeamSummary, 0, len(teamIDs))
		for _, tid := range teamIDs {
			team, err := s.teamRepo.FindByID(ctx, tid)
			if err != nil || team == nil {
				continue
			}
			teams = append(teams, model.TeamSummary{
				ID:   team.ID,
				Name: team.Name,
				Seed: team.Seed,
			})
		}
		g.Teams = teams
	}
	return groups, nil
}

// UpdateGroup updates a group's name and advance_count.
func (s *GroupService) UpdateGroup(ctx context.Context, groupID uuid.UUID, name string, advanceCount int) (*model.TournamentGroup, error) {
	g, err := s.groupRepo.FindGroupByID(ctx, groupID)
	if err != nil {
		return nil, apperror.Wrap(err, "find group")
	}
	if g == nil {
		return nil, apperror.NotFound("group")
	}
	if name == "" {
		return nil, apperror.BusinessRule("INVALID_NAME", "Nama grup harus diisi")
	}
	if advanceCount < 0 {
		return nil, apperror.BusinessRule("INVALID_ADVANCE_COUNT", "Jumlah lolos tidak boleh negatif")
	}
	if err := s.groupRepo.UpdateGroup(ctx, groupID, name, advanceCount); err != nil {
		return nil, apperror.Wrap(err, "update group")
	}
	g.Name = name
	g.AdvanceCount = advanceCount
	s.broadcastGroupUpdate(g.TournamentID, "group_updated")
	return g, nil
}

// DeleteGroup removes a group and all associated data (cascade).
func (s *GroupService) DeleteGroup(ctx context.Context, groupID uuid.UUID) error {
	g, err := s.groupRepo.FindGroupByID(ctx, groupID)
	if err != nil {
		return apperror.Wrap(err, "find group")
	}
	if g == nil {
		return apperror.NotFound("group")
	}
	if err := s.groupRepo.DeleteGroup(ctx, groupID); err != nil {
		return apperror.Wrap(err, "delete group")
	}
	s.broadcastGroupUpdate(g.TournamentID, "group_deleted")
	return nil
}

// AddTeams adds multiple teams to a group.
func (s *GroupService) AddTeams(ctx context.Context, groupID uuid.UUID, teamIDs []uuid.UUID) error {
	g, err := s.groupRepo.FindGroupByID(ctx, groupID)
	if err != nil {
		return apperror.Wrap(err, "find group")
	}
	if g == nil {
		return apperror.NotFound("group")
	}

	for _, tid := range teamIDs {
		if err := s.groupRepo.AddTeamToGroup(ctx, groupID, tid); err != nil {
			return apperror.Wrap(err, "add team to group")
		}
	}
	s.broadcastGroupUpdate(g.TournamentID, "group_teams_changed")
	return nil
}

// RemoveTeam removes a single team from a group.
func (s *GroupService) RemoveTeam(ctx context.Context, groupID, teamID uuid.UUID) error {
	return s.groupRepo.RemoveTeamFromGroup(ctx, groupID, teamID)
}

// AutoDrawGroups randomly distributes all registered tournament teams into N groups,
// creates the groups, assigns teams, and generates round-robin matches for each.
func (s *GroupService) AutoDrawGroups(ctx context.Context, tournamentID uuid.UUID, numGroups, advancePerGroup, legs int) ([]*model.TournamentGroup, error) {
	t, err := s.tournamentRepo.FindByID(ctx, tournamentID)
	if err != nil || t == nil {
		return nil, apperror.NotFound("tournament")
	}

	teams, err := s.ttRepo.ListApprovedTeams(ctx, tournamentID)
	if err != nil {
		return nil, apperror.Wrap(err, "list approved teams")
	}
	if len(teams) < numGroups*2 {
		return nil, apperror.BusinessRule("NOT_ENOUGH_TEAMS",
			fmt.Sprintf("Minimal %d tim untuk %d grup", numGroups*2, numGroups))
	}

	// Delete existing groups
	existingGroups, _ := s.groupRepo.FindGroupsByTournament(ctx, tournamentID)
	for _, g := range existingGroups {
		_ = s.groupRepo.DeleteGroup(ctx, g.ID)
	}

	// Shuffle teams
	rand.Shuffle(len(teams), func(i, j int) {
		teams[i], teams[j] = teams[j], teams[i]
	})

	groupNames := []string{"A", "B", "C", "D", "E", "F", "G", "H"}
	var createdGroups []*model.TournamentGroup

	for i := 0; i < numGroups; i++ {
		name := "Grup " + groupNames[i%len(groupNames)]
		if legs <= 0 {
			legs = 1
		}
		g := &model.TournamentGroup{
			TournamentID: tournamentID,
			Name:         name,
			GroupOrder:   i + 1,
			AdvanceCount: advancePerGroup,
			Legs:         legs,
		}
		if err := s.groupRepo.CreateGroup(ctx, g); err != nil {
			return nil, apperror.Wrap(err, "create group")
		}
		createdGroups = append(createdGroups, g)
	}

	// Snake draft: 0,1,2,3,3,2,1,0,...
	for i, team := range teams {
		cycle := i / numGroups
		idx := i % numGroups
		if cycle%2 == 1 {
			idx = numGroups - 1 - idx
		}
		_ = s.groupRepo.AddTeamToGroup(ctx, createdGroups[idx].ID, team.ID)
	}

	for _, g := range createdGroups {
		if _, err := s.GenerateMatches(ctx, g.ID); err != nil {
			slog.Error("failed to generate matches", "group", g.Name, "error", err)
		}
	}

	s.broadcastGroupUpdate(tournamentID, "auto_draw_completed")

	return createdGroups, nil
}
