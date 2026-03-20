package service

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
)

type SchoolDashboard struct {
	School    *model.School            `json:"school"`
	Teams     []*model.Team            `json:"teams"`
	Standings []*model.Standing        `json:"standings"`
	RecentMatches []*model.BracketMatch `json:"recent_matches"`
	Submissions   []*model.MatchSubmission `json:"submissions"`
	Stats     SchoolStats              `json:"stats"`
}

type SchoolStats struct {
	TotalTeams         int `json:"total_teams"`
	TotalMatches       int `json:"total_matches"`
	Wins               int `json:"wins"`
	Losses             int `json:"losses"`
	PendingSubmissions int `json:"pending_submissions"`
}

type CoachService struct {
	coachSchoolRepo model.CoachSchoolRepository
	teamRepo        model.TeamRepository
	schoolRepo      model.SchoolRepository
	standingsRepo   model.StandingsRepository
	bracketRepo     model.BracketRepository
	brResultRepo    model.BRLobbyResultRepository
	submissionRepo  model.MatchSubmissionRepository
}

func NewCoachService(
	coachSchoolRepo model.CoachSchoolRepository,
	teamRepo model.TeamRepository,
	schoolRepo model.SchoolRepository,
	standingsRepo model.StandingsRepository,
	bracketRepo model.BracketRepository,
	brResultRepo model.BRLobbyResultRepository,
	submissionRepo model.MatchSubmissionRepository,
) *CoachService {
	return &CoachService{
		coachSchoolRepo: coachSchoolRepo,
		teamRepo:        teamRepo,
		schoolRepo:      schoolRepo,
		standingsRepo:   standingsRepo,
		bracketRepo:     bracketRepo,
		brResultRepo:    brResultRepo,
		submissionRepo:  submissionRepo,
	}
}

// AssignSchool assigns a coach to a school (admin action).
func (s *CoachService) AssignSchool(ctx context.Context, coachUserID, schoolID uuid.UUID) error {
	// Validate school exists
	school, err := s.schoolRepo.FindByID(ctx, schoolID)
	if err != nil || school == nil {
		return apperror.NotFound("SCHOOL")
	}

	// Check if already assigned
	existing, err := s.coachSchoolRepo.FindByUser(ctx, coachUserID)
	if err != nil {
		return apperror.Wrap(err, "check existing coach schools")
	}
	for _, cs := range existing {
		if cs.SchoolID == schoolID {
			return apperror.Conflict("ALREADY_ASSIGNED", "Coach sudah ditugaskan ke sekolah ini")
		}
	}

	cs := &model.CoachSchool{
		ID:       uuid.New(),
		UserID:   coachUserID,
		SchoolID: schoolID,
	}

	if err := s.coachSchoolRepo.Create(ctx, cs); err != nil {
		return apperror.Wrap(err, "assign school to coach")
	}

	return nil
}

// GetCoachSchools returns all schools assigned to a coach.
func (s *CoachService) GetCoachSchools(ctx context.Context, coachUserID uuid.UUID) ([]*model.School, error) {
	coachSchools, err := s.coachSchoolRepo.FindByUser(ctx, coachUserID)
	if err != nil {
		return nil, apperror.Wrap(err, "get coach schools")
	}

	var schools []*model.School
	for _, cs := range coachSchools {
		school, err := s.schoolRepo.FindByID(ctx, cs.SchoolID)
		if err != nil || school == nil {
			continue
		}
		schools = append(schools, school)
	}

	return schools, nil
}

// GetSchoolTeams returns all teams from a coach's assigned schools.
func (s *CoachService) GetSchoolTeams(ctx context.Context, coachUserID uuid.UUID) ([]*model.Team, error) {
	coachSchools, err := s.coachSchoolRepo.FindByUser(ctx, coachUserID)
	if err != nil {
		return nil, apperror.Wrap(err, "get coach schools for teams")
	}

	var allTeams []*model.Team
	for _, cs := range coachSchools {
		teams, _, err := s.teamRepo.List(ctx, model.TeamFilter{
			SchoolID: &cs.SchoolID,
			Page:     1,
			Limit:    100,
		})
		if err != nil {
			continue
		}
		allTeams = append(allTeams, teams...)
	}

	return allTeams, nil
}

// GetSchoolResults returns an aggregate dashboard for a coach's school.
func (s *CoachService) GetSchoolResults(ctx context.Context, coachUserID uuid.UUID, tournamentID *uuid.UUID) ([]*SchoolDashboard, error) {
	coachSchools, err := s.coachSchoolRepo.FindByUser(ctx, coachUserID)
	if err != nil {
		return nil, apperror.Wrap(err, "get coach schools for results")
	}

	if len(coachSchools) == 0 {
		return nil, apperror.BusinessRule("NO_SCHOOLS", "Coach belum ditugaskan ke sekolah manapun")
	}

	var dashboards []*SchoolDashboard
	for _, cs := range coachSchools {
		dashboard, err := s.buildSchoolDashboard(ctx, cs.SchoolID, tournamentID)
		if err != nil {
			continue
		}
		dashboards = append(dashboards, dashboard)
	}

	return dashboards, nil
}

func (s *CoachService) buildSchoolDashboard(ctx context.Context, schoolID uuid.UUID, tournamentID *uuid.UUID) (*SchoolDashboard, error) {
	school, err := s.schoolRepo.FindByID(ctx, schoolID)
	if err != nil || school == nil {
		return nil, fmt.Errorf("school not found")
	}

	// Get teams for this school
	teams, _, err := s.teamRepo.List(ctx, model.TeamFilter{
		SchoolID: &schoolID,
		Page:     1,
		Limit:    100,
	})
	if err != nil {
		return nil, fmt.Errorf("list teams: %w", err)
	}

	stats := SchoolStats{
		TotalTeams: len(teams),
	}

	var allStandings []*model.Standing
	var recentMatches []*model.BracketMatch
	var submissions []*model.MatchSubmission

	for _, team := range teams {
		// Get standings for each team
		if tournamentID != nil {
			standing, err := s.standingsRepo.FindByTournamentAndTeam(ctx, *tournamentID, team.ID)
			if err == nil && standing != nil {
				allStandings = append(allStandings, standing)
				stats.TotalMatches += standing.MatchesPlayed
				stats.Wins += standing.Wins
				stats.Losses += standing.Losses
			}
		}

		// Get submissions for each team
		teamSubs, err := s.submissionRepo.FindByTeam(ctx, team.ID)
		if err == nil {
			submissions = append(submissions, teamSubs...)
			for _, sub := range teamSubs {
				if sub.Status == "pending" {
					stats.PendingSubmissions++
				}
			}
		}
	}

	// Get recent bracket matches for the tournament if specified
	if tournamentID != nil {
		matches, err := s.bracketRepo.ListByTournament(ctx, *tournamentID)
		if err == nil {
			for _, m := range matches {
				for _, team := range teams {
					if (m.TeamAID != nil && *m.TeamAID == team.ID) || (m.TeamBID != nil && *m.TeamBID == team.ID) {
						recentMatches = append(recentMatches, m)
						break
					}
				}
			}
		}
		// Limit to last 10
		if len(recentMatches) > 10 {
			recentMatches = recentMatches[len(recentMatches)-10:]
		}
	}

	return &SchoolDashboard{
		School:        school,
		Teams:         teams,
		Standings:     allStandings,
		RecentMatches: recentMatches,
		Submissions:   submissions,
		Stats:         stats,
	}, nil
}

// GetCoachSubmissions returns all submissions for teams under a coach's schools.
func (s *CoachService) GetCoachSubmissions(ctx context.Context, coachUserID uuid.UUID) ([]*model.MatchSubmission, error) {
	teams, err := s.GetSchoolTeams(ctx, coachUserID)
	if err != nil {
		return nil, err
	}

	var allSubs []*model.MatchSubmission
	for _, team := range teams {
		subs, err := s.submissionRepo.FindByTeam(ctx, team.ID)
		if err != nil {
			continue
		}
		allSubs = append(allSubs, subs...)
	}

	return allSubs, nil
}
