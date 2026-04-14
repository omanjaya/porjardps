package service

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
	"github.com/porjar-denpasar/porjar-api/internal/ws"
)

type BRService struct {
	lobbyRepo          model.BRLobbyRepository
	resultRepo         model.BRLobbyResultRepository
	pointRuleRepo      model.BRPointRuleRepository
	playerResultRepo   model.BRPlayerResultRepository
	penaltyRepo        model.BRPenaltyRepository
	ttRepo             model.TournamentTeamRepository
	standingsRepo      model.StandingsRepository
	dailyStandingsRepo model.BRDailyStandingsRepository
	tournamentRepo     model.TournamentRepository
	hub                *ws.Hub
}

func NewBRService(
	lobbyRepo model.BRLobbyRepository,
	resultRepo model.BRLobbyResultRepository,
	pointRuleRepo model.BRPointRuleRepository,
	ttRepo model.TournamentTeamRepository,
	standingsRepo model.StandingsRepository,
	hub *ws.Hub,
) *BRService {
	return &BRService{
		lobbyRepo:     lobbyRepo,
		resultRepo:    resultRepo,
		pointRuleRepo: pointRuleRepo,
		ttRepo:        ttRepo,
		standingsRepo: standingsRepo,
		hub:           hub,
	}
}

// SetDailyStandingsRepo sets the daily standings repository (optional dependency)
func (s *BRService) SetDailyStandingsRepo(repo model.BRDailyStandingsRepository) {
	s.dailyStandingsRepo = repo
}

// SetTournamentRepo sets the tournament repository (optional dependency)
func (s *BRService) SetTournamentRepo(repo model.TournamentRepository) {
	s.tournamentRepo = repo
}

// SetPlayerResultRepo sets the player result repository (optional dependency)
func (s *BRService) SetPlayerResultRepo(repo model.BRPlayerResultRepository) {
	s.playerResultRepo = repo
}

// SetPenaltyRepo sets the penalty repository (optional dependency)
func (s *BRService) SetPenaltyRepo(repo model.BRPenaltyRepository) {
	s.penaltyRepo = repo
}

func (s *BRService) broadcastLobbyUpdate(tournamentID, lobbyID uuid.UUID, action string) {
	if s.hub == nil {
		return
	}
	payload, err := ws.NewBroadcastData("lobby_update", map[string]interface{}{
		"tournament_id": tournamentID.String(),
		"lobby_id":      lobbyID.String(),
		"action":        action,
	})
	if err != nil {
		return
	}
	s.hub.BroadcastToRoom(fmt.Sprintf("tournament:%s", tournamentID.String()), payload)
}

// CreateLobby creates a new BR lobby for a tournament
func (s *BRService) CreateLobby(
	ctx context.Context,
	tournamentID uuid.UUID,
	lobbyName string,
	lobbyNumber int,
	dayNumber int,
	numMaps int,
	mapNames []string,
	roomID *string,
	roomPassword *string,
	scheduledAt *time.Time,
) (*model.BRLobby, error) {
	if numMaps < 1 {
		numMaps = 1
	}
	if mapNames == nil {
		mapNames = []string{}
	}
	lobby := &model.BRLobby{
		ID:           uuid.New(),
		TournamentID: tournamentID,
		LobbyName:    lobbyName,
		LobbyNumber:  lobbyNumber,
		DayNumber:    dayNumber,
		NumMaps:      numMaps,
		MapNames:     mapNames,
		RoomID:       roomID,
		RoomPassword: roomPassword,
		Status:       "scheduled",
		ScheduledAt:  scheduledAt,
	}

	if err := s.lobbyRepo.Create(ctx, lobby); err != nil {
		return nil, apperror.Wrap(err, "create lobby")
	}

	s.broadcastLobbyUpdate(tournamentID, lobby.ID, "created")

	return lobby, nil
}

// UpdateLobby updates lobby details (name, map count, map names, room info, schedule).
func (s *BRService) UpdateLobby(
	ctx context.Context,
	lobbyID uuid.UUID,
	lobbyName string,
	numMaps int,
	mapNames []string,
	roomID *string,
	roomPassword *string,
	scheduledAt *time.Time,
) (*model.BRLobby, error) {
	lobby, err := s.lobbyRepo.FindByID(ctx, lobbyID)
	if err != nil || lobby == nil {
		return nil, apperror.NotFound("LOBBY")
	}
	if numMaps < 1 {
		numMaps = 1
	}
	if mapNames == nil {
		mapNames = []string{}
	}
	lobby.LobbyName = lobbyName
	lobby.NumMaps = numMaps
	lobby.MapNames = mapNames
	lobby.RoomID = roomID
	lobby.RoomPassword = roomPassword
	lobby.ScheduledAt = scheduledAt
	if err := s.lobbyRepo.Update(ctx, lobby); err != nil {
		return nil, apperror.Wrap(err, "update lobby")
	}

	s.broadcastLobbyUpdate(lobby.TournamentID, lobbyID, "updated")

	return lobby, nil
}

// DeleteLobby deletes a lobby and all its results
func (s *BRService) DeleteLobby(ctx context.Context, lobbyID uuid.UUID) error {
	lobby, err := s.lobbyRepo.FindByID(ctx, lobbyID)
	if err != nil || lobby == nil {
		return apperror.NotFound("LOBBY")
	}

	if err := s.lobbyRepo.Delete(ctx, lobbyID); err != nil {
		return apperror.Wrap(err, "delete lobby")
	}

	s.broadcastLobbyUpdate(lobby.TournamentID, lobbyID, "deleted")

	return nil
}

// UpdateLobbyStatus updates the status of a lobby
func (s *BRService) UpdateLobbyStatus(ctx context.Context, lobbyID uuid.UUID, status string) error {
	lobby, err := s.lobbyRepo.FindByID(ctx, lobbyID)
	if err != nil || lobby == nil {
		return apperror.NotFound("LOBBY")
	}

	// Set timestamps based on status transitions
	now := time.Now()
	switch status {
	case "live":
		lobby.StartedAt = &now
	case "completed":
		lobby.CompletedAt = &now
	}

	lobby.Status = status
	if err := s.lobbyRepo.Update(ctx, lobby); err != nil {
		return apperror.Wrap(err, "update lobby status")
	}

	s.broadcastLobbyUpdate(lobby.TournamentID, lobbyID, "status_changed")

	return nil
}

// GetLobby returns a lobby with its results
func (s *BRService) GetLobby(ctx context.Context, lobbyID uuid.UUID) (*model.BRLobby, []*model.BRLobbyResult, error) {
	lobby, err := s.lobbyRepo.FindByID(ctx, lobbyID)
	if err != nil || lobby == nil {
		return nil, nil, apperror.NotFound("LOBBY")
	}

	results, err := s.resultRepo.ListByLobby(ctx, lobbyID)
	if err != nil {
		return nil, nil, apperror.Wrap(err, "list lobby results")
	}

	return lobby, results, nil
}

// GetLobbysByTournament returns all lobbies for a tournament
func (s *BRService) GetLobbysByTournament(ctx context.Context, tournamentID uuid.UUID) ([]*model.BRLobby, error) {
	lobbies, err := s.lobbyRepo.ListByTournament(ctx, tournamentID)
	if err != nil {
		return nil, apperror.Wrap(err, "list tournament lobbies")
	}
	return lobbies, nil
}
