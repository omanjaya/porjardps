package service

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
	"github.com/porjar-denpasar/porjar-api/internal/ws"
)

// Tournament Status Lifecycle:
//   upcoming → registration → ongoing → completed
//   upcoming → registration → active → completed
//   Any state → cancelled (terminal)
//   completed, cancelled → no further transitions

type PointDistributor interface {
	DistributePoints(ctx context.Context, tournamentID uuid.UUID) error
}

type TournamentService struct {
	tournamentRepo     model.TournamentRepository
	tournamentTeamRepo model.TournamentTeamRepository
	teamRepo           model.TeamRepository
	teamMemberRepo     model.TeamMemberRepository
	gameRepo           model.GameRepository
	schoolRepo         model.SchoolRepository
	hub                *ws.Hub
	pointDistributor   PointDistributor
}

func (s *TournamentService) SetHub(h *ws.Hub)                     { s.hub = h }
func (s *TournamentService) SetPointDistributor(pd PointDistributor) { s.pointDistributor = pd }
func (s *TournamentService) SetSchoolRepo(r model.SchoolRepository)  { s.schoolRepo = r }

func (s *TournamentService) broadcastTournamentUpdate(tournamentID uuid.UUID, action string, data interface{}) {
	if s.hub == nil {
		return
	}
	payload, err := ws.NewBroadcastData("tournament_update", data)
	if err != nil {
		slog.Error("failed to marshal tournament broadcast", "error", err)
		return
	}
	s.hub.BroadcastToRoom(fmt.Sprintf("tournament:%s", tournamentID.String()), payload)
	s.hub.BroadcastToRoom("live-scores", payload)
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
	EventID           uuid.UUID  `json:"event_id"`
	GameID            uuid.UUID  `json:"game_id"`
	Name              string     `json:"name"`
	Format            string     `json:"format"`
	Stage             string     `json:"stage"`
	BestOf            int        `json:"best_of"`
	MaxTeams          *int       `json:"max_teams"`
	SchoolLevel       *string    `json:"school_level"`
	DailyStartTime    *string    `json:"daily_start_time"`
	RegistrationStart *time.Time `json:"registration_start"`
	RegistrationEnd   *time.Time `json:"registration_end"`
	StartDate         *time.Time `json:"start_date"`
	EndDate           *time.Time `json:"end_date"`
	Rules             *string    `json:"rules"`
}

type UpdateTournamentInput struct {
	EventID           *uuid.UUID `json:"event_id"`
	Name              *string    `json:"name"`
	Format            *string    `json:"format"`
	Stage             *string    `json:"stage"`
	BestOf            *int       `json:"best_of"`
	MaxTeams          *int       `json:"max_teams"`
	Status            *string    `json:"status"`
	SchoolLevel       *string    `json:"school_level"`
	DailyStartTime    *string    `json:"daily_start_time"`
	DefaultNumMaps    *int       `json:"default_num_maps"`
	DefaultMapNames   []string   `json:"default_map_names"`
	TiebreakerOrder   []string   `json:"tiebreaker_order"`
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

	// Validate BestOf (must be >= 1 and odd)
	if input.BestOf < 1 {
		return nil, apperror.BusinessRule("INVALID_BEST_OF", "Best of harus minimal 1")
	}
	if input.BestOf%2 == 0 {
		return nil, apperror.BusinessRule("INVALID_BEST_OF", "Best of harus bilangan ganjil (1, 3, 5, 7)")
	}

	now := time.Now()
	tournament := &model.Tournament{
		ID:                uuid.New(),
		EventID:           input.EventID,
		GameID:            input.GameID,
		Name:              input.Name,
		Format:            input.Format,
		Stage:             input.Stage,
		BestOf:            input.BestOf,
		MaxTeams:          input.MaxTeams,
		SchoolLevel:       input.SchoolLevel,
		DailyStartTime:    input.DailyStartTime,
		Status:            "upcoming",
		KillPointValue:    1.0,
		DefaultNumMaps:    1,
		DefaultMapNames:   []string{},
		TiebreakerOrder:   []string{"wwcd", "placement_points", "kills", "best_placement"},
		RegistrationStart: input.RegistrationStart,
		RegistrationEnd:   input.RegistrationEnd,
		StartDate:         input.StartDate,
		EndDate:           input.EndDate,
		Rules:             input.Rules,
		CreatedAt:         now,
		UpdatedAt:         now,
	}

	// BUG 4: Validate date ordering on create
	if err := validateDateOrder(tournament); err != nil {
		return nil, err
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

	// BUG 1: Validate status value and transitions
	if input.Status != nil && *input.Status != tournament.Status {
		validStatuses := map[string]bool{
			"upcoming": true, "registration": true, "ongoing": true,
			"active": true, "completed": true, "cancelled": true,
		}
		if !validStatuses[*input.Status] {
			return nil, apperror.BusinessRule("INVALID_STATUS", "Status harus salah satu dari: upcoming, registration, ongoing, active, completed, cancelled")
		}

		allowedTransitions := map[string][]string{
			"upcoming":     {"registration", "cancelled"},
			"registration": {"ongoing", "cancelled"},
			"ongoing":      {"completed", "cancelled"},
			"active":       {"completed", "cancelled"},
			"completed":    {},
			"cancelled":    {},
		}
		allowed := allowedTransitions[tournament.Status]
		valid := false
		for _, s := range allowed {
			if s == *input.Status {
				valid = true
				break
			}
		}
		if !valid {
			return nil, apperror.BusinessRule("INVALID_STATUS_TRANSITION",
				"Transisi status dari '"+tournament.Status+"' ke '"+*input.Status+"' tidak diperbolehkan")
		}
	}

	// BUG 2: Validate BestOf (must be >= 1 and odd)
	if input.BestOf != nil {
		if *input.BestOf < 1 {
			return nil, apperror.BusinessRule("INVALID_BEST_OF", "Best of harus minimal 1")
		}
		if *input.BestOf%2 == 0 {
			return nil, apperror.BusinessRule("INVALID_BEST_OF", "Best of harus bilangan ganjil (1, 3, 5, 7)")
		}
	}

	// BUG 3: Validate format against game type if format is being changed
	if input.Format != nil && *input.Format != tournament.Format {
		game, err := s.gameRepo.FindByID(ctx, tournament.GameID)
		if err != nil || game == nil {
			return nil, apperror.NotFound("GAME")
		}
		if !isValidFormatForGameType(*input.Format, game.GameType) {
			return nil, apperror.BusinessRule("INVALID_FORMAT_FOR_GAME", "Format turnamen tidak sesuai dengan tipe game")
		}
	}

	if input.EventID != nil {
		tournament.EventID = *input.EventID
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
	if input.SchoolLevel != nil {
		tournament.SchoolLevel = input.SchoolLevel
	}
	if input.DailyStartTime != nil {
		tournament.DailyStartTime = input.DailyStartTime
	}
	if input.DefaultNumMaps != nil {
		tournament.DefaultNumMaps = *input.DefaultNumMaps
	}
	if input.DefaultMapNames != nil {
		tournament.DefaultMapNames = input.DefaultMapNames
	}
	if input.TiebreakerOrder != nil {
		tournament.TiebreakerOrder = input.TiebreakerOrder
	}

	// BUG 4: Validate date ordering
	if err := validateDateOrder(tournament); err != nil {
		return nil, err
	}

	tournament.UpdatedAt = time.Now()

	if err := s.tournamentRepo.Update(ctx, tournament); err != nil {
		return nil, apperror.Wrap(err, "update tournament")
	}

	// Auto-distribute event points when tournament is completed
	if input.Status != nil && *input.Status == "completed" && s.pointDistributor != nil {
		if err := s.pointDistributor.DistributePoints(ctx, id); err != nil {
			slog.Error("failed to distribute event points", "tournament_id", id, "error", err)
		}
	}

	s.broadcastTournamentUpdate(id, "updated", map[string]interface{}{
		"tournament_id": id.String(),
		"action":        "updated",
		"status":        tournament.Status,
	})

	return tournament, nil
}

func (s *TournamentService) Delete(ctx context.Context, id uuid.UUID) error {
	tournament, err := s.tournamentRepo.FindByID(ctx, id)
	if err != nil || tournament == nil {
		return apperror.NotFound("TOURNAMENT")
	}

	// Check if tournament has registered teams
	teams, err := s.tournamentTeamRepo.ListByTournament(ctx, id)
	if err == nil && len(teams) > 0 {
		return apperror.Conflict("TOURNAMENT_HAS_TEAMS", "Tidak dapat menghapus turnamen yang sudah memiliki tim terdaftar")
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

	// Validate school level matches tournament
	if tournament.SchoolLevel != nil && *tournament.SchoolLevel != "" {
		if team.SchoolLevel == nil || *team.SchoolLevel != *tournament.SchoolLevel {
			return apperror.BusinessRule("SCHOOL_LEVEL_MISMATCH", "Tingkat sekolah tim tidak sesuai dengan kategori turnamen")
		}
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

	// Validate school level matches tournament
	if tournament.SchoolLevel != nil && *tournament.SchoolLevel != "" {
		if team.SchoolLevel == nil || *team.SchoolLevel != *tournament.SchoolLevel {
			return apperror.BusinessRule("SCHOOL_LEVEL_MISMATCH", "Tingkat sekolah tim tidak sesuai dengan kategori turnamen")
		}
	}

	// Check if already registered — return conflict
	existing, err := s.tournamentTeamRepo.FindByTournamentAndTeam(ctx, tournamentID, teamID)
	if err == nil && existing != nil {
		return apperror.Conflict("ALREADY_REGISTERED", "Tim sudah terdaftar di turnamen ini")
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

// SetChampion records the winning team of a tournament and marks it completed.
// Safe to call multiple times; overwrites prior champion.
func (s *TournamentService) SetChampion(ctx context.Context, tournamentID uuid.UUID, teamID uuid.UUID) error {
	tournament, err := s.tournamentRepo.FindByID(ctx, tournamentID)
	if err != nil || tournament == nil {
		return apperror.NotFound("TOURNAMENT")
	}

	team, err := s.teamRepo.FindByID(ctx, teamID)
	if err != nil || team == nil {
		return apperror.NotFound("TEAM")
	}

	teamID2 := team.ID
	name := team.Name
	var logo *string
	if team.LogoURL != nil && *team.LogoURL != "" {
		logo = team.LogoURL
	} else if s.schoolRepo != nil && team.SchoolID != nil {
		if school, err := s.schoolRepo.FindByID(ctx, *team.SchoolID); err == nil && school != nil && school.LogoURL != nil {
			logo = school.LogoURL
		}
	}

	tournament.ChampionTeamID = &teamID2
	tournament.ChampionTeamName = &name
	tournament.ChampionTeamLogo = logo
	if tournament.Status != "completed" {
		tournament.Status = "completed"
	}
	tournament.UpdatedAt = time.Now()

	if err := s.tournamentRepo.Update(ctx, tournament); err != nil {
		return apperror.Wrap(err, "set champion")
	}

	s.broadcastTournamentUpdate(tournamentID, "champion_set", map[string]interface{}{
		"tournament_id": tournamentID.String(),
		"team_id":       teamID2.String(),
		"team_name":     name,
	})

	if s.pointDistributor != nil {
		if err := s.pointDistributor.DistributePoints(ctx, tournamentID); err != nil {
			slog.Error("failed to distribute event points on champion set", "tournament_id", tournamentID, "error", err)
		}
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

