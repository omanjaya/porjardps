package service

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
)

// LobbyAssignment represents a team's lobby assignment for a round
type LobbyAssignment struct {
	TeamID      uuid.UUID `json:"team_id"`
	LobbyNumber int       `json:"lobby_number"`
}

type LobbyRotationService struct {
	lobbyTeamRepo model.BRLobbyTeamRepository
	lobbyRepo     model.BRLobbyRepository
	ttRepo        model.TournamentTeamRepository
	teamRepo      model.TeamRepository
}

func NewLobbyRotationService(
	lobbyTeamRepo model.BRLobbyTeamRepository,
	lobbyRepo model.BRLobbyRepository,
	ttRepo model.TournamentTeamRepository,
	teamRepo model.TeamRepository,
) *LobbyRotationService {
	return &LobbyRotationService{
		lobbyTeamRepo: lobbyTeamRepo,
		lobbyRepo:     lobbyRepo,
		ttRepo:        ttRepo,
		teamRepo:      teamRepo,
	}
}

// GenerateRotation creates a balanced rotation matrix.
// Given N teams and M lobbies with teamsPerLobby capacity, it produces
// multiple rounds where teams rotate through lobbies evenly.
// Returns assignment matrix: rounds[round_index] = []LobbyAssignment
func (s *LobbyRotationService) GenerateRotation(
	ctx context.Context,
	tournamentID uuid.UUID,
	numLobbies int,
	teamsPerLobby int,
) ([][]LobbyAssignment, error) {
	// Get all approved teams for this tournament
	teams, err := s.ttRepo.ListApprovedTeams(ctx, tournamentID)
	if err != nil {
		return nil, apperror.Wrap(err, "list approved teams")
	}

	if len(teams) == 0 {
		return nil, apperror.BusinessRule("NO_TEAMS", "Tidak ada tim yang terdaftar di turnamen ini")
	}

	totalSlots := numLobbies * teamsPerLobby
	if totalSlots < len(teams) {
		return nil, apperror.BusinessRule("INSUFFICIENT_SLOTS",
			fmt.Sprintf("Total slot (%d) tidak cukup untuk %d tim", totalSlots, len(teams)))
	}

	// Round-robin rotation algorithm:
	// For each round, shift team assignments by one lobby position
	numRounds := numLobbies // each team plays in each lobby roughly once
	var rounds [][]LobbyAssignment

	for round := 0; round < numRounds; round++ {
		var assignments []LobbyAssignment
		for i, team := range teams {
			lobbyIdx := (i/teamsPerLobby + round) % numLobbies
			assignments = append(assignments, LobbyAssignment{
				TeamID:      team.ID,
				LobbyNumber: lobbyIdx + 1, // 1-indexed
			})
		}
		rounds = append(rounds, assignments)
	}

	return rounds, nil
}

// AssignTeamsToLobby manually assigns specific teams to a lobby
func (s *LobbyRotationService) AssignTeamsToLobby(ctx context.Context, lobbyID uuid.UUID, teamIDs []uuid.UUID) error {
	lobby, err := s.lobbyRepo.FindByID(ctx, lobbyID)
	if err != nil || lobby == nil {
		return apperror.NotFound("LOBBY")
	}

	// Remove existing assignments
	if err := s.lobbyTeamRepo.RemoveAll(ctx, lobbyID); err != nil {
		return apperror.Wrap(err, "remove existing assignments")
	}

	// Assign new teams
	if err := s.lobbyTeamRepo.AssignTeams(ctx, lobbyID, teamIDs); err != nil {
		return apperror.Wrap(err, "assign teams to lobby")
	}

	return nil
}

// GetLobbyTeams returns teams assigned to a specific lobby
func (s *LobbyRotationService) GetLobbyTeams(ctx context.Context, lobbyID uuid.UUID) ([]*model.Team, error) {
	lobbyTeams, err := s.lobbyTeamRepo.FindByLobby(ctx, lobbyID)
	if err != nil {
		return nil, apperror.Wrap(err, "find lobby teams")
	}

	var teams []*model.Team
	for _, lt := range lobbyTeams {
		team, err := s.teamRepo.FindByID(ctx, lt.TeamID)
		if err != nil {
			return nil, apperror.Wrap(err, "find team")
		}
		if team != nil {
			teams = append(teams, team)
		}
	}

	return teams, nil
}

// AutoAssignForDay auto-rotates teams for a new day based on round-robin rotation
func (s *LobbyRotationService) AutoAssignForDay(ctx context.Context, tournamentID uuid.UUID, dayNumber int, numLobbies int) error {
	// Get all approved teams
	teams, err := s.ttRepo.ListApprovedTeams(ctx, tournamentID)
	if err != nil {
		return apperror.Wrap(err, "list approved teams")
	}

	if len(teams) == 0 {
		return apperror.BusinessRule("NO_TEAMS", "Tidak ada tim yang terdaftar")
	}

	// Get lobbies for this day
	allLobbies, err := s.lobbyRepo.ListByTournament(ctx, tournamentID)
	if err != nil {
		return apperror.Wrap(err, "list lobbies")
	}

	var dayLobbies []*model.BRLobby
	for _, l := range allLobbies {
		if l.DayNumber == dayNumber {
			dayLobbies = append(dayLobbies, l)
		}
	}

	if len(dayLobbies) == 0 {
		return apperror.BusinessRule("NO_LOBBIES", fmt.Sprintf("Tidak ada lobby untuk hari %d", dayNumber))
	}

	// Calculate teams per lobby
	teamsPerLobby := len(teams) / len(dayLobbies)
	if teamsPerLobby == 0 {
		teamsPerLobby = 1
	}
	remainder := len(teams) % len(dayLobbies)

	// Rotate based on day number (shift = dayNumber - 1)
	shift := (dayNumber - 1) * teamsPerLobby

	for lobbyIdx, lobby := range dayLobbies {
		// Remove existing assignments
		if err := s.lobbyTeamRepo.RemoveAll(ctx, lobby.ID); err != nil {
			return apperror.Wrap(err, "remove existing")
		}

		// Calculate which teams go to this lobby
		count := teamsPerLobby
		if lobbyIdx < remainder {
			count++
		}

		var teamIDs []uuid.UUID
		for j := 0; j < count; j++ {
			teamIdx := (lobbyIdx*teamsPerLobby + j + shift) % len(teams)
			teamIDs = append(teamIDs, teams[teamIdx].ID)
		}

		if err := s.lobbyTeamRepo.AssignTeams(ctx, lobby.ID, teamIDs); err != nil {
			return apperror.Wrap(err, fmt.Sprintf("assign teams to lobby %s", lobby.LobbyName))
		}
	}

	return nil
}
