package service

import (
	"context"
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

// CreateLobby creates a new BR lobby for a tournament
func (s *BRService) CreateLobby(
	ctx context.Context,
	tournamentID uuid.UUID,
	lobbyName string,
	lobbyNumber int,
	dayNumber int,
	roomID *string,
	roomPassword *string,
	scheduledAt *time.Time,
) (*model.BRLobby, error) {
	lobby := &model.BRLobby{
		ID:           uuid.New(),
		TournamentID: tournamentID,
		LobbyName:    lobbyName,
		LobbyNumber:  lobbyNumber,
		DayNumber:    dayNumber,
		RoomID:       roomID,
		RoomPassword: roomPassword,
		Status:       "scheduled",
		ScheduledAt:  scheduledAt,
	}

	if err := s.lobbyRepo.Create(ctx, lobby); err != nil {
		return nil, apperror.Wrap(err, "create lobby")
	}

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
