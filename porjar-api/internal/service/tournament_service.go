package service

import (
	"context"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
)

type TournamentService struct {
	tournamentRepo     model.TournamentRepository
	tournamentTeamRepo model.TournamentTeamRepository
	teamRepo           model.TeamRepository
	teamMemberRepo     model.TeamMemberRepository
	gameRepo           model.GameRepository
}

func NewTournamentService(
	tournamentRepo model.TournamentRepository,
	tournamentTeamRepo model.TournamentTeamRepository,
	teamRepo model.TeamRepository,
	teamMemberRepo model.TeamMemberRepository,
	gameRepo model.GameRepository,
) *TournamentService {
	return &TournamentService{
		tournamentRepo:     tournamentRepo,
		tournamentTeamRepo: tournamentTeamRepo,
		teamRepo:           teamRepo,
		teamMemberRepo:     teamMemberRepo,
		gameRepo:           gameRepo,
	}
}

type CreateTournamentInput struct {
	GameID            uuid.UUID  `json:"game_id"`
	Name              string     `json:"name"`
	Format            string     `json:"format"`
	Stage             string     `json:"stage"`
	BestOf            int        `json:"best_of"`
	MaxTeams          *int       `json:"max_teams"`
	RegistrationStart *time.Time `json:"registration_start"`
	RegistrationEnd   *time.Time `json:"registration_end"`
	StartDate         *time.Time `json:"start_date"`
	EndDate           *time.Time `json:"end_date"`
	Rules             *string    `json:"rules"`
}

type UpdateTournamentInput struct {
	Name              *string    `json:"name"`
	Format            *string    `json:"format"`
	Stage             *string    `json:"stage"`
	BestOf            *int       `json:"best_of"`
	MaxTeams          *int       `json:"max_teams"`
	Status            *string    `json:"status"`
	RegistrationStart *time.Time `json:"registration_start"`
	RegistrationEnd   *time.Time `json:"registration_end"`
	StartDate         *time.Time `json:"start_date"`
	EndDate           *time.Time `json:"end_date"`
	Rules             *string    `json:"rules"`
}

func (s *TournamentService) Create(ctx context.Context, input CreateTournamentInput) (*model.Tournament, error) {
	// Validate game exists
	game, err := s.gameRepo.FindByID(ctx, input.GameID)
	if err != nil || game == nil {
		return nil, apperror.NotFound("GAME")
	}

	// Validate format matches game type
	if !isValidFormatForGameType(input.Format, game.GameType) {
		return nil, apperror.BusinessRule("INVALID_FORMAT_FOR_GAME", "Format turnamen tidak sesuai dengan tipe game")
	}

	now := time.Now()
	tournament := &model.Tournament{
		ID:                uuid.New(),
		GameID:            input.GameID,
		Name:              input.Name,
		Format:            input.Format,
		Stage:             input.Stage,
		BestOf:            input.BestOf,
		MaxTeams:          input.MaxTeams,
		Status:            "upcoming",
		KillPointValue:    1.0,
		RegistrationStart: input.RegistrationStart,
		RegistrationEnd:   input.RegistrationEnd,
		StartDate:         input.StartDate,
		EndDate:           input.EndDate,
		Rules:             input.Rules,
		CreatedAt:         now,
		UpdatedAt:         now,
	}

	if err := s.tournamentRepo.Create(ctx, tournament); err != nil {
		return nil, apperror.Wrap(err, "create tournament")
	}

	return tournament, nil
}

func (s *TournamentService) GetByID(ctx context.Context, id uuid.UUID) (*model.Tournament, error) {
	tournament, err := s.tournamentRepo.FindByID(ctx, id)
	if err != nil || tournament == nil {
		return nil, apperror.NotFound("TOURNAMENT")
	}
	s.enrichTournaments(ctx, []*model.Tournament{tournament})
	return tournament, nil
}

func (s *TournamentService) Update(ctx context.Context, id uuid.UUID, input UpdateTournamentInput) (*model.Tournament, error) {
	tournament, err := s.tournamentRepo.FindByID(ctx, id)
	if err != nil || tournament == nil {
		return nil, apperror.NotFound("TOURNAMENT")
	}

	if input.Name != nil {
		tournament.Name = *input.Name
	}
	if input.Format != nil {
		tournament.Format = *input.Format
	}
	if input.Stage != nil {
		tournament.Stage = *input.Stage
	}
	if input.BestOf != nil {
		tournament.BestOf = *input.BestOf
	}
	if input.MaxTeams != nil {
		tournament.MaxTeams = input.MaxTeams
	}
	if input.Status != nil {
		tournament.Status = *input.Status
	}
	if input.RegistrationStart != nil {
		tournament.RegistrationStart = input.RegistrationStart
	}
	if input.RegistrationEnd != nil {
		tournament.RegistrationEnd = input.RegistrationEnd
	}
	if input.StartDate != nil {
		tournament.StartDate = input.StartDate
	}
	if input.EndDate != nil {
		tournament.EndDate = input.EndDate
	}
	if input.Rules != nil {
		tournament.Rules = input.Rules
	}
	tournament.UpdatedAt = time.Now()

	if err := s.tournamentRepo.Update(ctx, tournament); err != nil {
		return nil, apperror.Wrap(err, "update tournament")
	}

	return tournament, nil
}

func (s *TournamentService) Delete(ctx context.Context, id uuid.UUID) error {
	tournament, err := s.tournamentRepo.FindByID(ctx, id)
	if err != nil || tournament == nil {
		return apperror.NotFound("TOURNAMENT")
	}

	if err := s.tournamentRepo.Delete(ctx, id); err != nil {
		return apperror.Wrap(err, "delete tournament")
	}

	return nil
}

func (s *TournamentService) List(ctx context.Context, filter model.TournamentFilter) ([]*model.Tournament, int, error) {
	tournaments, total, err := s.tournamentRepo.List(ctx, filter)
	if err != nil {
		return nil, 0, apperror.Wrap(err, "list tournaments")
	}
	s.enrichTournaments(ctx, tournaments)
	return tournaments, total, nil
}

// enrichTournaments populates Game and TeamCount for a list of tournaments.
// Uses batch queries to avoid N+1 problems.
func (s *TournamentService) enrichTournaments(ctx context.Context, tournaments []*model.Tournament) {
	if len(tournaments) == 0 {
		return
	}

	// Collect unique game IDs and tournament IDs
	gameIDSet := make(map[uuid.UUID]struct{})
	tournamentIDs := make([]uuid.UUID, 0, len(tournaments))
	for _, t := range tournaments {
		gameIDSet[t.GameID] = struct{}{}
		tournamentIDs = append(tournamentIDs, t.ID)
	}

	// Batch fetch games
	gameMap := make(map[uuid.UUID]*model.Game)
	if s.gameRepo != nil && len(gameIDSet) > 0 {
		gameIDs := make([]uuid.UUID, 0, len(gameIDSet))
		for id := range gameIDSet {
			gameIDs = append(gameIDs, id)
		}
		if games, err := s.gameRepo.FindByIDs(ctx, gameIDs); err == nil {
			for _, g := range games {
				gameMap[g.ID] = g
			}
		} else {
			slog.Error("failed to batch fetch games for enrichment", "error", err)
		}
	}

	// Batch fetch team counts
	teamCountMap := make(map[uuid.UUID]int)
	if counts, err := s.tournamentRepo.CountTeamsBatch(ctx, tournamentIDs); err == nil {
		teamCountMap = counts
	} else {
		slog.Error("failed to batch fetch team counts for enrichment", "error", err)
	}

	// Apply enrichment
	for _, t := range tournaments {
		if game, ok := gameMap[t.GameID]; ok {
			t.Game = &model.GameSummary{
				ID:       game.ID,
				Name:     game.Name,
				Slug:     game.Slug,
				GameType: game.GameType,
			}
		}
		t.TeamCount = teamCountMap[t.ID]
	}
}

func (s *TournamentService) RegisterTeam(ctx context.Context, tournamentID, teamID, captainUserID uuid.UUID) error {
	// Validate tournament exists
	tournament, err := s.tournamentRepo.FindByID(ctx, tournamentID)
	if err != nil || tournament == nil {
		return apperror.NotFound("TOURNAMENT")
	}

	// Check registration is open
	now := time.Now()
	if tournament.Status != "registration" {
		return apperror.BusinessRule("REGISTRATION_NOT_OPEN", "Pendaftaran turnamen belum dibuka")
	}
	if tournament.RegistrationStart != nil && now.Before(*tournament.RegistrationStart) {
		return apperror.BusinessRule("REGISTRATION_NOT_STARTED", "Pendaftaran turnamen belum dimulai")
	}
	if tournament.RegistrationEnd != nil && now.After(*tournament.RegistrationEnd) {
		return apperror.BusinessRule("REGISTRATION_CLOSED", "Pendaftaran turnamen sudah ditutup")
	}

	// Check tournament not full
	if tournament.MaxTeams != nil {
		teamCount, err := s.tournamentRepo.CountTeams(ctx, tournamentID)
		if err != nil {
			return apperror.Wrap(err, "count tournament teams")
		}
		if teamCount >= *tournament.MaxTeams {
			return apperror.BusinessRule("TOURNAMENT_FULL", "Turnamen sudah penuh")
		}
	}

	// Validate team exists and is approved
	team, err := s.teamRepo.FindByID(ctx, teamID)
	if err != nil || team == nil {
		return apperror.NotFound("TEAM")
	}
	if team.Status != "approved" {
		return apperror.BusinessRule("TEAM_NOT_APPROVED", "Tim belum disetujui")
	}

	// Validate captain owns the team
	if team.CaptainUserID == nil || *team.CaptainUserID != captainUserID {
		return apperror.New("FORBIDDEN", "Hanya kapten tim yang dapat mendaftarkan tim", 403)
	}

	// Check team has enough members
	game, err := s.gameRepo.FindByID(ctx, team.GameID)
	if err != nil || game == nil {
		return apperror.NotFound("GAME")
	}
	memberCount, err := s.teamMemberRepo.CountByTeam(ctx, teamID)
	if err != nil {
		return apperror.Wrap(err, "count team members")
	}
	if memberCount < game.MinTeamMembers {
		return apperror.BusinessRule("TEAM_INSUFFICIENT_MEMBERS", "Tim belum memiliki cukup anggota")
	}

	// Check not already registered
	existing, err := s.tournamentTeamRepo.FindByTournamentAndTeam(ctx, tournamentID, teamID)
	if err == nil && existing != nil {
		return apperror.Conflict("TEAM_ALREADY_REGISTERED", "Tim sudah terdaftar di turnamen ini")
	}

	tt := &model.TournamentTeam{
		ID:           uuid.New(),
		TournamentID: tournamentID,
		TeamID:       teamID,
		Status:       "registered",
	}

	if err := s.tournamentTeamRepo.Create(ctx, tt); err != nil {
		return apperror.Wrap(err, "register team")
	}

	return nil
}

func (s *TournamentService) GetTeams(ctx context.Context, tournamentID uuid.UUID) ([]*model.Team, error) {
	// Validate tournament exists
	tournament, err := s.tournamentRepo.FindByID(ctx, tournamentID)
	if err != nil || tournament == nil {
		return nil, apperror.NotFound("TOURNAMENT")
	}

	teams, err := s.tournamentTeamRepo.ListApprovedTeams(ctx, tournamentID)
	if err != nil {
		return nil, apperror.Wrap(err, "list tournament teams")
	}

	return teams, nil
}

func (s *TournamentService) GetTournamentTeamRecords(ctx context.Context, tournamentID uuid.UUID) ([]*model.TournamentTeam, error) {
	tournament, err := s.tournamentRepo.FindByID(ctx, tournamentID)
	if err != nil || tournament == nil {
		return nil, apperror.NotFound("TOURNAMENT")
	}

	teams, err := s.tournamentTeamRepo.ListByTournament(ctx, tournamentID)
	if err != nil {
		return nil, apperror.Wrap(err, "list tournament team records")
	}

	return teams, nil
}

// AdminRegisterTeam registers a team to a tournament bypassing normal registration checks.
// Only validates: tournament exists, team exists, team is approved, game matches.
// If the team is already registered, it silently skips (no error).
func (s *TournamentService) AdminRegisterTeam(ctx context.Context, tournamentID, teamID uuid.UUID) error {
	// Validate tournament exists
	tournament, err := s.tournamentRepo.FindByID(ctx, tournamentID)
	if err != nil || tournament == nil {
		return apperror.NotFound("TOURNAMENT")
	}

	// Validate team exists and is approved
	team, err := s.teamRepo.FindByID(ctx, teamID)
	if err != nil || team == nil {
		return apperror.NotFound("TEAM")
	}
	if team.Status != "approved" {
		return apperror.BusinessRule("TEAM_NOT_APPROVED", "Tim belum disetujui")
	}

	// Validate game matches
	if team.GameID != tournament.GameID {
		return apperror.BusinessRule("GAME_MISMATCH", "Game tim tidak sesuai dengan game turnamen")
	}

	// Check if already registered — skip silently
	existing, err := s.tournamentTeamRepo.FindByTournamentAndTeam(ctx, tournamentID, teamID)
	if err == nil && existing != nil {
		return nil
	}

	tt := &model.TournamentTeam{
		ID:           uuid.New(),
		TournamentID: tournamentID,
		TeamID:       teamID,
		Status:       "approved",
	}

	if err := s.tournamentTeamRepo.Create(ctx, tt); err != nil {
		return apperror.Wrap(err, "admin register team")
	}

	return nil
}

// AdminRemoveTeam removes a team from a tournament.
func (s *TournamentService) AdminRemoveTeam(ctx context.Context, tournamentID, teamID uuid.UUID) error {
	// Validate tournament exists
	tournament, err := s.tournamentRepo.FindByID(ctx, tournamentID)
	if err != nil || tournament == nil {
		return apperror.NotFound("TOURNAMENT")
	}

	// Check if team is registered
	existing, err := s.tournamentTeamRepo.FindByTournamentAndTeam(ctx, tournamentID, teamID)
	if err != nil || existing == nil {
		return apperror.NotFound("TOURNAMENT_TEAM")
	}

	if err := s.tournamentTeamRepo.Delete(ctx, tournamentID, teamID); err != nil {
		return apperror.Wrap(err, "admin remove team")
	}

	return nil
}

// isValidFormatForGameType checks if the tournament format is valid for the game type.
func isValidFormatForGameType(format, gameType string) bool {
	// Common formats: single_elimination, double_elimination, round_robin, swiss, battle_royale
	// Game types: moba, fps, battle_royale, fighting, racing, etc.
	if gameType == "battle_royale" && format != "battle_royale" && format != "battle_royale_points" && format != "round_robin" {
		return false
	}
	return true
}
