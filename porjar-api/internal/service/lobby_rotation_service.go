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
	// For each round, rotate INDIVIDUAL team membership (not whole fixed
	// blocks) through the lobby grid so that a team's lobby-mates change
	// from round to round. We do this by cyclically shifting each team's
	// "slot" position by `round*stride` (mod totalTeams) and then bucketing
	// slots into lobbies of size teamsPerLobby. Because the shift is a
	// modular addition over 0..totalTeams-1, it is always a bijection on
	// slot indices, so every team still lands in exactly one slot (and
	// therefore exactly one lobby) per round - no team is ever dropped or
	// assigned twice. `stride` is deliberately NOT a multiple of
	// teamsPerLobby: a stride that is a multiple of teamsPerLobby would
	// shift whole blocks by whole lobbies (reproducing the original bug,
	// where block membership never actually changes). stride=1 shifts the
	// window by a single team each round, guaranteeing composition drifts
	// round over round.
	numRounds := numLobbies // each team plays in each lobby roughly once
	var rounds [][]LobbyAssignment
	totalTeams := len(teams)
	stride := 1

	for round := 0; round < numRounds; round++ {
		var assignments []LobbyAssignment
		seen := make(map[uuid.UUID]bool, totalTeams)
		for i, team := range teams {
			slot := (i + round*stride) % totalTeams
			lobbyIdx := slot / teamsPerLobby
			if lobbyIdx >= numLobbies {
				// Defensive: should be unreachable since totalSlots >= totalTeams
				// was already validated above, but never emit an out-of-range lobby.
				lobbyIdx = numLobbies - 1
			}
			assignments = append(assignments, LobbyAssignment{
				TeamID:      team.ID,
				LobbyNumber: lobbyIdx + 1, // 1-indexed
			})
			seen[team.ID] = true
		}
		// Invariant: every team must be assigned exactly once per round.
		// Since we range over `teams` exactly once per round (one
		// assignment appended per team), duplicates/omissions can only
		// happen if `teams` itself contained a duplicate ID; guard against
		// that defensively rather than silently producing a bad rotation.
		if len(seen) != totalTeams {
			return nil, apperror.Wrap(
				fmt.Errorf("rotation invariant violated: round %d assigned %d unique teams, want %d", round, len(seen), totalTeams),
				"generate rotation",
			)
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

// SwapLobbyTeams swaps teamA (from lobbyA) with teamB (from lobbyB) atomically.
// Both lobbies must be pending or scheduled.
func (s *LobbyRotationService) SwapLobbyTeams(
	ctx context.Context,
	teamAID, lobbyAID, teamBID, lobbyBID uuid.UUID,
) error {
	if teamAID == teamBID {
		return apperror.BusinessRule("SAME_TEAM", "Tidak bisa menukar tim dengan dirinya sendiri")
	}

	lobbyA, err := s.lobbyRepo.FindByID(ctx, lobbyAID)
	if err != nil || lobbyA == nil {
		return apperror.NotFound("LOBBY_A")
	}
	lobbyB, err := s.lobbyRepo.FindByID(ctx, lobbyBID)
	if err != nil || lobbyB == nil {
		return apperror.NotFound("LOBBY_B")
	}

	allowed := map[string]bool{"pending": true, "scheduled": true}
	if !allowed[lobbyA.Status] {
		return apperror.BusinessRule("LOBBY_NOT_SWAPPABLE", "Lobby A harus berstatus pending atau scheduled")
	}
	if !allowed[lobbyB.Status] {
		return apperror.BusinessRule("LOBBY_NOT_SWAPPABLE", "Lobby B harus berstatus pending atau scheduled")
	}

	teamsA, err := s.lobbyTeamRepo.FindByLobby(ctx, lobbyAID)
	if err != nil {
		return apperror.Wrap(err, "find lobby A teams")
	}
	teamsB, err := s.lobbyTeamRepo.FindByLobby(ctx, lobbyBID)
	if err != nil {
		return apperror.Wrap(err, "find lobby B teams")
	}

	teamAInLobbyA := false
	for _, lt := range teamsA {
		if lt.TeamID == teamAID {
			teamAInLobbyA = true
			break
		}
	}
	teamBInLobbyB := false
	for _, lt := range teamsB {
		if lt.TeamID == teamBID {
			teamBInLobbyB = true
			break
		}
	}

	if !teamAInLobbyA {
		return apperror.BusinessRule("TEAM_NOT_IN_LOBBY", "Tim A tidak ditemukan di Lobby A")
	}
	if !teamBInLobbyB {
		return apperror.BusinessRule("TEAM_NOT_IN_LOBBY", "Tim B tidak ditemukan di Lobby B")
	}

	return s.lobbyTeamRepo.SwapTeams(ctx, teamAID, lobbyAID, teamBID, lobbyBID)
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

	// Rotate INDIVIDUAL team membership by one team per day (shift = dayNumber - 1),
	// NOT by whole (dayNumber-1)*teamsPerLobby blocks. The old block-shift only moved
	// a fixed group of teams to a different lobby number each day - the group's
	// members never changed, so the same teams always played together. Here we
	// instead walk a single running position counter `pos` across ALL lobbies for
	// the day (0..len(teams)-1, matching the exact partition of team counts computed
	// above, including the remainder lobbies that get one extra team), and map each
	// position to a team via `(pos + shift) % len(teams)`. Because shift is a modular
	// addition over the full 0..len(teams)-1 range, this mapping is a bijection: every
	// team index appears in exactly one position across the whole day - no team is
	// skipped or double-booked - while which team occupies a given lobby slot still
	// changes from day to day (shift is 1 per day, never a multiple of teamsPerLobby
	// unless teamsPerLobby == 1, where "blocks" are meaningless anyway).
	shift := dayNumber - 1
	pos := 0

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
			teamIdx := (pos + shift) % len(teams)
			teamIDs = append(teamIDs, teams[teamIdx].ID)
			pos++
		}

		if err := s.lobbyTeamRepo.AssignTeams(ctx, lobby.ID, teamIDs); err != nil {
			return apperror.Wrap(err, fmt.Sprintf("assign teams to lobby %s", lobby.LobbyName))
		}
	}

	// Invariant: pos must equal len(teams) exactly - every team's slot was
	// consumed exactly once across all lobbies for this day (no duplicates,
	// no omissions).
	if pos != len(teams) {
		return apperror.Wrap(
			fmt.Errorf("auto-assign invariant violated: consumed %d slots, want %d", pos, len(teams)),
			"auto assign for day",
		)
	}

	return nil
}
