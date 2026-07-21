package service

import (
	"context"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
)

// schoolGameRegistrationChecker is implemented by repository.eventRegistrationRepo
// (see internal/repository/event_registration_repo.go). It is declared here,
// rather than added to model.EventRegistrationRepository, because that
// interface lives in internal/model/event_points.go which this fix must not
// modify. Go's structural typing lets the concrete repo satisfy this
// interface without any change to its own file's declared interface.
type schoolGameRegistrationChecker interface {
	FindByEventSchoolAndGame(ctx context.Context, eventID, schoolID, gameID uuid.UUID) (*model.EventRegistration, error)
}

type EventPointsService struct {
	pointRuleRepo    model.EventPointRuleRepository
	teamPointsRepo   model.EventTeamPointsRepository
	userPointsRepo   model.EventUserPointsRepository
	registrationRepo model.EventRegistrationRepository
	standingsRepo    model.StandingsRepository
	tournamentRepo   model.TournamentRepository
	tournamentTeamRepo model.TournamentTeamRepository
	teamMemberRepo   model.TeamMemberRepository
	teamRepo         model.TeamRepository
	eventRepo        model.EventRepository
}

func NewEventPointsService(
	pointRuleRepo model.EventPointRuleRepository,
	teamPointsRepo model.EventTeamPointsRepository,
	userPointsRepo model.EventUserPointsRepository,
	registrationRepo model.EventRegistrationRepository,
	standingsRepo model.StandingsRepository,
	tournamentRepo model.TournamentRepository,
	tournamentTeamRepo model.TournamentTeamRepository,
	teamMemberRepo model.TeamMemberRepository,
	teamRepo model.TeamRepository,
	eventRepo model.EventRepository,
) *EventPointsService {
	return &EventPointsService{
		pointRuleRepo:    pointRuleRepo,
		teamPointsRepo:   teamPointsRepo,
		userPointsRepo:   userPointsRepo,
		registrationRepo: registrationRepo,
		standingsRepo:    standingsRepo,
		tournamentRepo:   tournamentRepo,
		tournamentTeamRepo: tournamentTeamRepo,
		teamMemberRepo:   teamMemberRepo,
		teamRepo:         teamRepo,
		eventRepo:        eventRepo,
	}
}

// ──────────────────────────────────────────────
// Point Distribution
// ──────────────────────────────────────────────

// DistributePoints awards event points to teams and their members based on tournament standings.
// Called automatically when a tournament is completed. Idempotent — safe to re-run.
func (s *EventPointsService) DistributePoints(ctx context.Context, tournamentID uuid.UUID) error {
	tournament, err := s.tournamentRepo.FindByID(ctx, tournamentID)
	if err != nil || tournament == nil {
		return apperror.NotFound("TOURNAMENT")
	}

	rules, err := s.pointRuleRepo.ListByEvent(ctx, tournament.EventID)
	if err != nil {
		return apperror.Wrap(err, "fetch point rules")
	}
	if len(rules) == 0 {
		return apperror.BusinessRule("NO_POINT_RULES", "Belum ada aturan poin untuk event ini — atur di Point Rules dulu")
	}

	// Build rank → points lookup
	rankPoints := make(map[int]int)
	for _, rule := range rules {
		rankPoints[rule.RankPosition] = rule.Points
	}

	standings, err := s.standingsRepo.ListByTournament(ctx, tournamentID)
	if err != nil {
		return apperror.Wrap(err, "fetch standings")
	}

	now := time.Now()

	// Delete existing points for this tournament (idempotent re-run)
	if err := s.teamPointsRepo.DeleteByTournament(ctx, tournamentID); err != nil {
		return apperror.Wrap(err, "delete existing team points")
	}
	if err := s.userPointsRepo.DeleteByTournament(ctx, tournamentID); err != nil {
		return apperror.Wrap(err, "delete existing user points")
	}

	var teamPoints []*model.EventTeamPoints
	var userPoints []*model.EventUserPoints

	for _, standing := range standings {
		if standing.RankPosition == nil {
			continue
		}
		points, ok := rankPoints[*standing.RankPosition]
		if !ok || points == 0 {
			continue
		}

		// Team points
		teamPoints = append(teamPoints, &model.EventTeamPoints{
			ID:           uuid.New(),
			EventID:      tournament.EventID,
			TournamentID: tournamentID,
			TeamID:       standing.TeamID,
			RankPosition: *standing.RankPosition,
			Points:       points,
			AwardedAt:    now,
		})

		// User points — award to all current team members
		members, err := s.teamMemberRepo.FindByTeam(ctx, standing.TeamID)
		if err != nil {
			slog.Error("failed to fetch team members for point distribution",
				"team_id", standing.TeamID, "error", err)
			continue
		}
		for _, member := range members {
			if member.UserID == nil {
				continue
			}
			userPoints = append(userPoints, &model.EventUserPoints{
				ID:           uuid.New(),
				EventID:      tournament.EventID,
				TournamentID: tournamentID,
				UserID:       *member.UserID,
				TeamID:       standing.TeamID,
				RankPosition: *standing.RankPosition,
				Points:       points,
				AwardedAt:    now,
			})
		}
	}

	if err := s.teamPointsRepo.BulkCreate(ctx, teamPoints); err != nil {
		return apperror.Wrap(err, "create team points")
	}
	if err := s.userPointsRepo.BulkCreate(ctx, userPoints); err != nil {
		return apperror.Wrap(err, "create user points")
	}

	slog.Info("event points distributed",
		"tournament_id", tournamentID,
		"event_id", tournament.EventID,
		"teams_awarded", len(teamPoints),
		"users_awarded", len(userPoints))

	return nil
}

// ──────────────────────────────────────────────
// Point Rules
// ──────────────────────────────────────────────

type PointRuleInput struct {
	RankPosition int `json:"rank_position"`
	Points       int `json:"points"`
}

func (s *EventPointsService) GetPointRules(ctx context.Context, eventID uuid.UUID) ([]*model.EventPointRule, error) {
	return s.pointRuleRepo.ListByEvent(ctx, eventID)
}

func (s *EventPointsService) UpdatePointRules(ctx context.Context, eventID uuid.UUID, inputs []PointRuleInput) error {
	event, err := s.eventRepo.FindByID(ctx, eventID)
	if err != nil || event == nil {
		return apperror.NotFound("EVENT")
	}

	rules := make([]*model.EventPointRule, len(inputs))
	for i, input := range inputs {
		if input.RankPosition < 1 {
			return apperror.BusinessRule("INVALID_RANK", "Rank position harus minimal 1")
		}
		if input.Points < 0 {
			return apperror.BusinessRule("INVALID_POINTS", "Points tidak boleh negatif")
		}
		rules[i] = &model.EventPointRule{
			EventID:      eventID,
			RankPosition: input.RankPosition,
			Points:       input.Points,
		}
	}

	return s.pointRuleRepo.BulkUpsert(ctx, eventID, rules)
}

// ──────────────────────────────────────────────
// Event Registration
// ──────────────────────────────────────────────

func (s *EventPointsService) RegisterTeam(ctx context.Context, eventID, teamID, captainUserID uuid.UUID) (*model.EventRegistration, error) {
	event, err := s.eventRepo.FindByID(ctx, eventID)
	if err != nil || event == nil {
		return nil, apperror.NotFound("EVENT")
	}

	if !event.RegistrationOpen {
		return nil, apperror.BusinessRule("REGISTRATION_CLOSED", "Pendaftaran event belum dibuka atau sudah ditutup")
	}

	team, err := s.teamRepo.FindByID(ctx, teamID)
	if err != nil || team == nil {
		return nil, apperror.NotFound("TEAM")
	}

	if team.CaptainUserID == nil || *team.CaptainUserID != captainUserID {
		return nil, apperror.BusinessRule("NOT_CAPTAIN", "Hanya kapten tim yang dapat mendaftarkan tim ke event")
	}

	if team.Status != "approved" {
		return nil, apperror.BusinessRule("TEAM_NOT_APPROVED", "Tim harus sudah diapprove sebelum mendaftar ke event")
	}

	// Check school requirement
	if event.RequiresSchool {
		if team.SchoolID == nil {
			return nil, apperror.BusinessRule("SCHOOL_REQUIRED", "Event ini mengharuskan tim terdaftar di sekolah")
		}
		// Uniqueness is per (event, school, game): a school may register one
		// team per game in an event (e.g. one ML team and one FF team), but
		// not two teams for the same game. Prefer the game-aware check when
		// the concrete repo supports it; otherwise fall back to the old
		// school-wide check (which over-blocks multi-game schools) so this
		// never silently skips the duplicate guard entirely.
		if checker, ok := s.registrationRepo.(schoolGameRegistrationChecker); ok {
			existing, err := checker.FindByEventSchoolAndGame(ctx, eventID, *team.SchoolID, team.GameID)
			if err != nil {
				return nil, apperror.Wrap(err, "check school registration")
			}
			if existing != nil {
				return nil, apperror.Conflict("SCHOOL_ALREADY_REGISTERED", "Sekolah ini sudah memiliki tim yang terdaftar di game ini pada event ini")
			}
		} else {
			existing, err := s.registrationRepo.FindByEventAndSchool(ctx, eventID, *team.SchoolID)
			if err != nil {
				return nil, apperror.Wrap(err, "check school registration")
			}
			if existing != nil {
				return nil, apperror.Conflict("SCHOOL_ALREADY_REGISTERED", "Sekolah ini sudah memiliki tim yang terdaftar di event ini")
			}
		}
	}

	// Check not already registered
	existing, err := s.registrationRepo.FindByEventAndTeam(ctx, eventID, teamID)
	if err != nil {
		return nil, apperror.Wrap(err, "check existing registration")
	}
	if existing != nil {
		return nil, apperror.Conflict("ALREADY_REGISTERED", "Tim sudah terdaftar di event ini")
	}

	reg := &model.EventRegistration{
		ID:           uuid.New(),
		EventID:      eventID,
		TeamID:       teamID,
		RegisteredAt: time.Now(),
	}

	if err := s.registrationRepo.Create(ctx, reg); err != nil {
		return nil, apperror.Wrap(err, "create registration")
	}

	return reg, nil
}

func (s *EventPointsService) RemoveRegistration(ctx context.Context, eventID, teamID uuid.UUID) error {
	return s.registrationRepo.Delete(ctx, eventID, teamID)
}

func (s *EventPointsService) GetRegistrations(ctx context.Context, eventID uuid.UUID) ([]*model.EventRegistrationWithTeam, int, error) {
	regs, err := s.registrationRepo.ListByEventWithTeams(ctx, eventID)
	if err != nil {
		return nil, 0, apperror.Wrap(err, "list registrations")
	}
	count, err := s.registrationRepo.CountByEvent(ctx, eventID)
	if err != nil {
		return nil, 0, apperror.Wrap(err, "count registrations")
	}
	return regs, count, nil
}

// ──────────────────────────────────────────────
// Auto-Assign to Tournament
// ──────────────────────────────────────────────

// AutoAssignToTournament assigns all event-registered teams (matching the tournament's game)
// to the specified tournament. Returns the number of teams assigned.
func (s *EventPointsService) AutoAssignToTournament(ctx context.Context, eventID, tournamentID uuid.UUID) (int, error) {
	tournament, err := s.tournamentRepo.FindByID(ctx, tournamentID)
	if err != nil || tournament == nil {
		return 0, apperror.NotFound("TOURNAMENT")
	}

	if tournament.EventID != eventID {
		return 0, apperror.BusinessRule("EVENT_MISMATCH", "Tournament tidak termasuk dalam event ini")
	}

	regs, err := s.registrationRepo.ListByEvent(ctx, eventID)
	if err != nil {
		return 0, apperror.Wrap(err, "list event registrations")
	}

	assigned := 0
	for _, reg := range regs {
		// Fetch team to check game match
		team, err := s.teamRepo.FindByID(ctx, reg.TeamID)
		if err != nil || team == nil {
			continue
		}

		// Only assign teams that match the tournament's game
		if team.GameID != tournament.GameID {
			continue
		}

		// Skip if already in tournament
		existing, err := s.tournamentTeamRepo.FindByTournamentAndTeam(ctx, tournamentID, reg.TeamID)
		if err != nil {
			continue
		}
		if existing != nil {
			continue
		}

		tt := &model.TournamentTeam{
			ID:           uuid.New(),
			TournamentID: tournamentID,
			TeamID:       reg.TeamID,
			Status:       "approved",
		}
		if err := s.tournamentTeamRepo.Create(ctx, tt); err != nil {
			slog.Error("failed to auto-assign team to tournament",
				"team_id", reg.TeamID, "tournament_id", tournamentID, "error", err)
			continue
		}
		assigned++
	}

	return assigned, nil
}

// ──────────────────────────────────────────────
// Leaderboards
// ──────────────────────────────────────────────

func (s *EventPointsService) TeamLeaderboard(ctx context.Context, eventID *uuid.UUID, limit, offset int) ([]*model.TeamLeaderboardEntry, int, error) {
	if eventID != nil {
		return s.teamPointsRepo.TeamLeaderboard(ctx, *eventID, limit, offset)
	}
	return s.teamPointsRepo.TeamLeaderboardGlobal(ctx, limit, offset)
}

func (s *EventPointsService) UserLeaderboard(ctx context.Context, eventID *uuid.UUID, limit, offset int) ([]*model.UserLeaderboardEntry, int, error) {
	if eventID != nil {
		return s.userPointsRepo.UserLeaderboard(ctx, *eventID, limit, offset)
	}
	return s.userPointsRepo.UserLeaderboardGlobal(ctx, limit, offset)
}

func (s *EventPointsService) SchoolLeaderboard(ctx context.Context, eventID *uuid.UUID, limit, offset int) ([]*model.SchoolLeaderboardEntry, int, error) {
	if eventID != nil {
		return s.teamPointsRepo.SchoolLeaderboard(ctx, *eventID, limit, offset)
	}
	return s.teamPointsRepo.SchoolLeaderboardGlobal(ctx, limit, offset)
}

func (s *EventPointsService) GetMyPoints(ctx context.Context, userID uuid.UUID) ([]*model.EnrichedUserPoints, error) {
	return s.userPointsRepo.ListByUserEnriched(ctx, userID)
}

func (s *EventPointsService) GetMyEvents(ctx context.Context, userID uuid.UUID) ([]*model.MyEventRegistration, error) {
	return s.registrationRepo.ListByUser(ctx, userID)
}
