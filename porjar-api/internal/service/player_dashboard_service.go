package service

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
)

// ── Player Dashboard DTOs ─────────────────────────────────────────────────────

type PlayerTeamSummary struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type PlayerBracketMatch struct {
	ID              string             `json:"id"`
	TournamentID    string             `json:"tournament_id"`
	Round           int                `json:"round"`
	MatchNumber     int                `json:"match_number"`
	BracketPosition *string            `json:"bracket_position"`
	TeamA           *PlayerTeamSummary `json:"team_a"`
	TeamB           *PlayerTeamSummary `json:"team_b"`
	Winner          *PlayerTeamSummary `json:"winner"`
	ScoreA          int                `json:"score_a"`
	ScoreB          int                `json:"score_b"`
	Status          string             `json:"status"`
	ScheduledAt     *time.Time         `json:"scheduled_at"`
	StartedAt       *time.Time         `json:"started_at"`
	CompletedAt     *time.Time         `json:"completed_at"`
	NextMatchID     *string            `json:"next_match_id"`
	BestOf          int                `json:"best_of"`
	StreamURL       *string            `json:"stream_url"`
}

type PlayerTeamMember struct {
	ID           string  `json:"id"`
	UserID       string  `json:"user_id"`
	FullName     string  `json:"full_name"`
	InGameName   string  `json:"in_game_name"`
	InGameID     *string `json:"in_game_id"`
	Role         string  `json:"role"`
	JerseyNumber *int    `json:"jersey_number"`
}

type PlayerTeamInfo struct {
	ID         string             `json:"id"`
	Name       string             `json:"name"`
	GameName   string             `json:"game_name"`
	GameSlug   string             `json:"game_slug"`
	SchoolName string             `json:"school_name"`
	LogoURL    *string            `json:"logo_url"`
	Members    []PlayerTeamMember `json:"members"`
}

type PlayerDashboardResponse struct {
	Team      *PlayerTeamInfo     `json:"team"`
	NextMatch *PlayerBracketMatch `json:"next_match"`
}

type PlayerSubmissionStatus struct {
	MatchID    string `json:"match_id"`
	Status     string `json:"status"`
	MatchLabel string `json:"match_label"`
}

type PlayerMyMatchesResponse struct {
	Team            *PlayerTeamInfo          `json:"team"`
	CurrentMatch    *PlayerBracketMatch      `json:"current_match"`
	UpcomingMatches []*PlayerBracketMatch    `json:"upcoming_matches"`
	PastMatches     []*PlayerBracketMatch    `json:"past_matches"`
	BracketPath     []string                 `json:"bracket_path"`
	Submissions     []PlayerSubmissionStatus `json:"submissions"`
}

// ── Service ───────────────────────────────────────────────────────────────────

type PlayerDashboardService struct {
	teamMemberRepo model.TeamMemberRepository
	teamRepo       model.TeamRepository
	bracketRepo    model.BracketRepository
	tournamentRepo model.TournamentRepository
	submissionRepo model.MatchSubmissionRepository
	schoolRepo     model.SchoolRepository
	gameRepo       model.GameRepository
	userRepo       model.UserRepository
}

func NewPlayerDashboardService(
	teamMemberRepo model.TeamMemberRepository,
	teamRepo model.TeamRepository,
	bracketRepo model.BracketRepository,
	tournamentRepo model.TournamentRepository,
	submissionRepo model.MatchSubmissionRepository,
	schoolRepo model.SchoolRepository,
	gameRepo model.GameRepository,
	userRepo model.UserRepository,
) *PlayerDashboardService {
	return &PlayerDashboardService{
		teamMemberRepo: teamMemberRepo,
		teamRepo:       teamRepo,
		bracketRepo:    bracketRepo,
		tournamentRepo: tournamentRepo,
		submissionRepo: submissionRepo,
		schoolRepo:     schoolRepo,
		gameRepo:       gameRepo,
		userRepo:       userRepo,
	}
}

// getPlayerTeamInfo returns enriched team info for the given user.
// Returns nil, nil if the user has no team.
func (s *PlayerDashboardService) getPlayerTeamInfo(ctx context.Context, userID uuid.UUID) (*PlayerTeamInfo, *uuid.UUID, error) {
	// Find user's team memberships
	memberships, err := s.teamMemberRepo.FindByUser(ctx, userID)
	if err != nil {
		return nil, nil, apperror.Wrap(err, "find user team memberships")
	}
	if len(memberships) == 0 {
		return nil, nil, nil
	}

	// Pick the first team
	teamID := memberships[0].TeamID
	team, err := s.teamRepo.FindByID(ctx, teamID)
	if err != nil || team == nil {
		return nil, nil, apperror.Wrap(err, "find team")
	}

	// Game info
	game, err := s.gameRepo.FindByID(ctx, team.GameID)
	if err != nil || game == nil {
		return nil, nil, apperror.Wrap(err, "find game")
	}

	// School info
	schoolName := ""
	if team.SchoolID != nil {
		school, err := s.schoolRepo.FindByID(ctx, *team.SchoolID)
		if err == nil && school != nil {
			schoolName = school.Name
		}
	}

	// Team members with full names (batch fetch users)
	rawMembers, err := s.teamMemberRepo.FindByTeam(ctx, teamID)
	if err != nil {
		return nil, nil, apperror.Wrap(err, "find team members")
	}

	// Collect unique user IDs for batch fetch
	userIDSet := make(map[uuid.UUID]struct{})
	for _, m := range rawMembers {
		if m.UserID != nil {
			userIDSet[*m.UserID] = struct{}{}
		}
	}
	userMap := make(map[uuid.UUID]*model.User)
	if len(userIDSet) > 0 {
		userIDs := make([]uuid.UUID, 0, len(userIDSet))
		for uid := range userIDSet {
			userIDs = append(userIDs, uid)
		}
		if users, err := s.userRepo.FindByIDs(ctx, userIDs); err == nil {
			for _, u := range users {
				userMap[u.ID] = u
			}
		}
	}

	members := make([]PlayerTeamMember, 0, len(rawMembers))
	for _, m := range rawMembers {
		fullName := m.InGameName
		userIDStr := ""
		if m.UserID != nil {
			userIDStr = m.UserID.String()
			if user, ok := userMap[*m.UserID]; ok {
				fullName = user.FullName
			}
		}
		members = append(members, PlayerTeamMember{
			ID:           m.ID.String(),
			UserID:       userIDStr,
			FullName:     fullName,
			InGameName:   m.InGameName,
			InGameID:     m.InGameID,
			Role:         m.Role,
			JerseyNumber: m.JerseyNumber,
		})
	}

	teamInfo := &PlayerTeamInfo{
		ID:         team.ID.String(),
		Name:       team.Name,
		GameName:   game.Name,
		GameSlug:   game.Slug,
		SchoolName: schoolName,
		LogoURL:    team.LogoURL,
		Members:    members,
	}
	return teamInfo, &teamID, nil
}

// enrichMatch converts a model.BracketMatch into PlayerBracketMatch with team summaries.
func (s *PlayerDashboardService) enrichMatch(
	ctx context.Context,
	m *model.BracketMatch,
	teamNameCache map[uuid.UUID]string,
	bestOfCache map[uuid.UUID]int,
) *PlayerBracketMatch {
	teamSummary := func(id *uuid.UUID) *PlayerTeamSummary {
		if id == nil {
			return nil
		}
		name, ok := teamNameCache[*id]
		if !ok {
			t, err := s.teamRepo.FindByID(ctx, *id)
			if err == nil && t != nil {
				name = t.Name
				teamNameCache[*id] = name
			}
		}
		return &PlayerTeamSummary{ID: id.String(), Name: name}
	}

	bestOf := 1
	if bo, ok := bestOfCache[m.TournamentID]; ok {
		bestOf = bo
	} else {
		t, err := s.tournamentRepo.FindByID(ctx, m.TournamentID)
		if err == nil && t != nil {
			bestOf = t.BestOf
			bestOfCache[m.TournamentID] = bestOf
		}
	}

	scoreA := 0
	if m.ScoreA != nil {
		scoreA = *m.ScoreA
	}
	scoreB := 0
	if m.ScoreB != nil {
		scoreB = *m.ScoreB
	}

	var nextMatchIDStr *string
	if m.NextMatchID != nil {
		s := m.NextMatchID.String()
		nextMatchIDStr = &s
	}

	return &PlayerBracketMatch{
		ID:              m.ID.String(),
		TournamentID:    m.TournamentID.String(),
		Round:           m.Round,
		MatchNumber:     m.MatchNumber,
		BracketPosition: m.BracketPosition,
		TeamA:           teamSummary(m.TeamAID),
		TeamB:           teamSummary(m.TeamBID),
		Winner:          teamSummary(m.WinnerID),
		ScoreA:          scoreA,
		ScoreB:          scoreB,
		Status:          m.Status,
		ScheduledAt:     m.ScheduledAt,
		StartedAt:       m.StartedAt,
		CompletedAt:     m.CompletedAt,
		NextMatchID:     nextMatchIDStr,
		BestOf:          bestOf,
		StreamURL:       m.StreamURL,
	}
}

// GetDashboard returns the player dashboard data for the given user.
func (s *PlayerDashboardService) GetDashboard(ctx context.Context, userID uuid.UUID) (*PlayerDashboardResponse, error) {
	teamInfo, teamID, err := s.getPlayerTeamInfo(ctx, userID)
	if err != nil {
		return nil, err
	}
	if teamInfo == nil {
		return &PlayerDashboardResponse{Team: nil, NextMatch: nil}, nil
	}

	// Find next match for the team
	matches, err := s.bracketRepo.ListByTeam(ctx, *teamID)
	if err != nil {
		return nil, apperror.Wrap(err, "list team matches")
	}

	teamNameCache := map[uuid.UUID]string{}
	bestOfCache := map[uuid.UUID]int{}

	// Find the earliest non-completed match (live > scheduled > pending)
	priority := map[string]int{"live": 0, "scheduled": 1, "pending": 2}
	var nextMatch *model.BracketMatch
	for _, m := range matches {
		if m.Status == "completed" || m.Status == "bye" {
			continue
		}
		if nextMatch == nil {
			nextMatch = m
			continue
		}
		// Prefer live over scheduled over pending
		if priority[m.Status] < priority[nextMatch.Status] {
			nextMatch = m
			continue
		}
		// Within same status, pick earliest scheduled_at, then lowest round+match
		if priority[m.Status] == priority[nextMatch.Status] {
			if m.ScheduledAt != nil && nextMatch.ScheduledAt != nil {
				if m.ScheduledAt.Before(*nextMatch.ScheduledAt) {
					nextMatch = m
				}
			} else if m.Round < nextMatch.Round || (m.Round == nextMatch.Round && m.MatchNumber < nextMatch.MatchNumber) {
				nextMatch = m
			}
		}
	}

	var nextMatchDTO *PlayerBracketMatch
	if nextMatch != nil {
		nextMatchDTO = s.enrichMatch(ctx, nextMatch, teamNameCache, bestOfCache)
	}

	return &PlayerDashboardResponse{
		Team:      teamInfo,
		NextMatch: nextMatchDTO,
	}, nil
}

// GetMyMatches returns the full match history and status for the given player.
func (s *PlayerDashboardService) GetMyMatches(ctx context.Context, userID uuid.UUID) (*PlayerMyMatchesResponse, error) {
	teamInfo, teamID, err := s.getPlayerTeamInfo(ctx, userID)
	if err != nil {
		return nil, err
	}
	if teamInfo == nil {
		return &PlayerMyMatchesResponse{
			Team:            nil,
			CurrentMatch:    nil,
			UpcomingMatches: []*PlayerBracketMatch{},
			PastMatches:     []*PlayerBracketMatch{},
			BracketPath:     []string{},
			Submissions:     []PlayerSubmissionStatus{},
		}, nil
	}

	// Get all bracket matches for the team
	matches, err := s.bracketRepo.ListByTeam(ctx, *teamID)
	if err != nil {
		return nil, apperror.Wrap(err, "list team matches")
	}

	// --- Task 1: batch-fetch all submissions to avoid N+1 ---
	matchIDs := make([]uuid.UUID, 0, len(matches))
	for _, m := range matches {
		if m.Status != "bye" {
			matchIDs = append(matchIDs, m.ID)
		}
	}
	submissionsMap, err := s.submissionRepo.FindByBracketMatchIDs(ctx, matchIDs)
	if err != nil {
		// Non-fatal: fall back to empty map so submission status shows "not_submitted"
		submissionsMap = map[uuid.UUID][]*model.MatchSubmission{}
	}

	// --- Task 2: pre-fetch all team names to populate cache before enrichMatch loop ---
	teamIDSet := make(map[uuid.UUID]struct{})
	for _, m := range matches {
		if m.TeamAID != nil {
			teamIDSet[*m.TeamAID] = struct{}{}
		}
		if m.TeamBID != nil {
			teamIDSet[*m.TeamBID] = struct{}{}
		}
		if m.WinnerID != nil {
			teamIDSet[*m.WinnerID] = struct{}{}
		}
	}
	teamNameCache := map[uuid.UUID]string{}
	if len(teamIDSet) > 0 {
		allTeamIDs := make([]uuid.UUID, 0, len(teamIDSet))
		for tid := range teamIDSet {
			allTeamIDs = append(allTeamIDs, tid)
		}
		if teams, err := s.teamRepo.FindByIDs(ctx, allTeamIDs); err == nil {
			for _, t := range teams {
				teamNameCache[t.ID] = t.Name
			}
		}
	}

	bestOfCache := map[uuid.UUID]int{}

	var currentMatch *PlayerBracketMatch
	upcoming := make([]*PlayerBracketMatch, 0)
	past := make([]*PlayerBracketMatch, 0)
	bracketPath := make([]string, 0)
	submissions := make([]PlayerSubmissionStatus, 0)

	for _, m := range matches {
		dto := s.enrichMatch(ctx, m, teamNameCache, bestOfCache)

		switch m.Status {
		case "live":
			currentMatch = dto
		case "completed", "bye":
			past = append(past, dto)
			if m.Status == "completed" {
				bracketPath = append(bracketPath, fmt.Sprintf("R%d Match %d", m.Round, m.MatchNumber))
			}
		case "scheduled", "pending":
			if currentMatch == nil && m.Status == "scheduled" {
				currentMatch = dto
			} else {
				upcoming = append(upcoming, dto)
			}
		}

		// Check submission status for this match using pre-fetched map (skip BYE matches)
		if m.Status != "bye" {
			subStatus := "not_submitted"
			for _, sub := range submissionsMap[m.ID] {
				if sub.TeamID == *teamID {
					subStatus = sub.Status
					break
				}
			}
			submissions = append(submissions, PlayerSubmissionStatus{
				MatchID:    m.ID.String(),
				Status:     subStatus,
				MatchLabel: fmt.Sprintf("Round %d Match %d", m.Round, m.MatchNumber),
			})
		}
	}

	// If currentMatch was set from "scheduled" but it was added to upcoming, fix it
	// (the loop logic above handles this by checking if currentMatch == nil)

	return &PlayerMyMatchesResponse{
		Team:            teamInfo,
		CurrentMatch:    currentMatch,
		UpcomingMatches: upcoming,
		PastMatches:     past,
		BracketPath:     bracketPath,
		Submissions:     submissions,
	}, nil
}
