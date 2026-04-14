package service

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/audit"
	"github.com/porjar-denpasar/porjar-api/internal/repository"
)

// CheckinWindowBefore — players can check in this long before match start.
const CheckinWindowBefore = 60 * time.Minute

type MatchCheckinService struct {
	checkinRepo    *repository.MatchCheckinRepo
	bracketRepo    model.BracketRepository
	teamMemberRepo model.TeamMemberRepository
}

func NewMatchCheckinService(
	checkinRepo *repository.MatchCheckinRepo,
	bracketRepo model.BracketRepository,
	teamMemberRepo model.TeamMemberRepository,
) *MatchCheckinService {
	return &MatchCheckinService{
		checkinRepo:    checkinRepo,
		bracketRepo:    bracketRepo,
		teamMemberRepo: teamMemberRepo,
	}
}

// CheckInBracket performs a check-in for a bracket match.
func (s *MatchCheckinService) CheckInBracket(
	ctx context.Context,
	matchID uuid.UUID,
	teamSide string,
	userID uuid.UUID,
) (*model.MatchCheckin, error) {
	if teamSide != "a" && teamSide != "b" {
		return nil, apperror.New("INVALID_TEAM_SIDE", "team_side harus 'a' atau 'b'", 400)
	}

	match, err := s.bracketRepo.FindByID(ctx, matchID)
	if err != nil {
		return nil, err
	}
	if match == nil {
		return nil, apperror.ErrNotFound
	}

	// Match must not be completed/cancelled
	switch match.Status {
	case "completed", "cancelled", "forfeit":
		return nil, apperror.New("MATCH_NOT_CHECKIN_ELIGIBLE", "Match sudah selesai, tidak bisa check-in", 400)
	}

	// Pick team ID for the requested side
	var teamID *uuid.UUID
	if teamSide == "a" {
		teamID = match.TeamAID
	} else {
		teamID = match.TeamBID
	}
	if teamID == nil {
		return nil, apperror.New("MATCH_TEAM_MISSING", "Tim belum ditentukan untuk sisi ini", 400)
	}

	// Verify user is a member of that team
	tm, err := s.teamMemberRepo.FindByTeamAndUser(ctx, *teamID, userID)
	if err != nil {
		return nil, err
	}
	if tm == nil {
		return nil, apperror.New("NOT_TEAM_MEMBER", "Anda bukan anggota tim ini", 403)
	}

	// Check-in window: up to CheckinWindowBefore before scheduled_at.
	// If scheduled_at is nil, allow check-in (unscheduled/live match).
	if match.ScheduledAt != nil {
		now := time.Now()
		openAt := match.ScheduledAt.Add(-CheckinWindowBefore)
		if now.Before(openAt) {
			return nil, apperror.New(
				"CHECKIN_TOO_EARLY",
				"Check-in baru bisa dilakukan 60 menit sebelum match dimulai",
				400,
			)
		}
	}

	ci := &model.MatchCheckin{
		MatchID:     matchID,
		MatchType:   "bracket",
		TeamID:      *teamID,
		TeamSide:    teamSide,
		CheckedInBy: &userID,
	}
	created, err := s.checkinRepo.Create(ctx, ci)
	if err != nil {
		return nil, err
	}

	audit.Log(ctx, audit.Entry{
		UserID:     &userID,
		Action:     "match_checkin",
		EntityType: "match",
		EntityID:   &matchID,
		Details: map[string]interface{}{
			"match_type": "bracket",
			"team_id":    teamID.String(),
			"team_side":  teamSide,
		},
	})

	return created, nil
}

// ResolveUserSide finds which side (a or b) the user's team occupies on the
// given bracket match. Returns "" if the user is not on either team.
func (s *MatchCheckinService) ResolveUserSide(
	ctx context.Context,
	matchID uuid.UUID,
	userID uuid.UUID,
) (string, error) {
	match, err := s.bracketRepo.FindByID(ctx, matchID)
	if err != nil {
		return "", err
	}
	if match == nil {
		return "", apperror.ErrNotFound
	}

	if match.TeamAID != nil {
		if tm, _ := s.teamMemberRepo.FindByTeamAndUser(ctx, *match.TeamAID, userID); tm != nil {
			return "a", nil
		}
	}
	if match.TeamBID != nil {
		if tm, _ := s.teamMemberRepo.FindByTeamAndUser(ctx, *match.TeamBID, userID); tm != nil {
			return "b", nil
		}
	}
	return "", nil
}
