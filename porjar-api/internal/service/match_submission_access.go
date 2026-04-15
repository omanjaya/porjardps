package service

import (
	"context"

	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
)

// CanAccessSubmission checks whether the given user (with the given role) is
// authorised to view a submission. Access is granted when the user is the
// original submitter, a member of the submitting team, or an admin.
func (s *MatchSubmissionService) CanAccessSubmission(ctx context.Context, sub *model.MatchSubmission, userID uuid.UUID, role string) bool {
	if role == model.RoleAdmin || role == model.RoleSuperAdmin {
		return true
	}
	if sub.SubmittedBy == userID {
		return true
	}
	member, _ := s.teamMemberRepo.FindByTeamAndUser(ctx, sub.TeamID, userID)
	return member != nil
}

// CheckTeamMember returns true if the user is a member of the given team.
func (s *MatchSubmissionService) CheckTeamMember(ctx context.Context, teamID, userID uuid.UUID) (bool, error) {
	member, err := s.teamMemberRepo.FindByTeamAndUser(ctx, teamID, userID)
	return member != nil, err
}

// FindUserTeamInLobby returns the team ID string for the user in the given BR lobby.
func (s *MatchSubmissionService) FindUserTeamInLobby(ctx context.Context, lobbyID, userID uuid.UUID) string {
	lobbyTeams, _ := s.brLobbyTeamRepo.FindByLobby(ctx, lobbyID)
	for _, lt := range lobbyTeams {
		if member, _ := s.teamMemberRepo.FindByTeamAndUser(ctx, lt.TeamID, userID); member != nil {
			return lt.TeamID.String()
		}
	}
	return ""
}

// FindUserTeamInGroupMatch returns the team ID string for the user in the given group match.
func (s *MatchSubmissionService) FindUserTeamInGroupMatch(ctx context.Context, matchID, userID uuid.UUID) string {
	if s.groupRepo == nil {
		return ""
	}
	gm, err := s.groupRepo.FindMatchByID(ctx, matchID)
	if err != nil || gm == nil {
		return ""
	}
	if gm.TeamAID != nil {
		if member, _ := s.teamMemberRepo.FindByTeamAndUser(ctx, *gm.TeamAID, userID); member != nil {
			return gm.TeamAID.String()
		}
	}
	if gm.TeamBID != nil {
		if member, _ := s.teamMemberRepo.FindByTeamAndUser(ctx, *gm.TeamBID, userID); member != nil {
			return gm.TeamBID.String()
		}
	}
	return ""
}
