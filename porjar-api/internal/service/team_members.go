package service

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
)

func (s *TeamService) AddMember(ctx context.Context, teamID, callerUserID, userID uuid.UUID, inGameName string, inGameID *string, role string, jerseyNumber *int) (*model.TeamMember, error) {
	team, err := s.teamRepo.FindByID(ctx, teamID)
	if err != nil || team == nil {
		return nil, apperror.NotFound("TEAM")
	}

	if team.CaptainUserID == nil || *team.CaptainUserID != callerUserID {
		return nil, apperror.New("FORBIDDEN", "Hanya kapten yang bisa menambahkan anggota tim", 403)
	}

	// Get game to check max members
	game, err := s.gameRepo.FindByID(ctx, team.GameID)
	if err != nil || game == nil {
		return nil, apperror.NotFound("GAME")
	}

	// Check team not full (max_team_members + max_substitutes)
	memberCount, err := s.teamMemberRepo.CountByTeam(ctx, teamID)
	if err != nil {
		return nil, apperror.Wrap(err, "count members")
	}
	maxTotal := game.MaxTeamMembers + game.MaxSubstitutes
	if memberCount >= maxTotal {
		return nil, apperror.BusinessRule("TEAM_FULL", "Tim sudah penuh, maksimal "+string(rune('0'+maxTotal))+" anggota")
	}

	// Check user not already in another team for the same game
	existingTeams, err := s.teamMemberRepo.FindUserTeamsForGame(ctx, userID, team.GameID)
	if err != nil {
		return nil, apperror.Wrap(err, "check user game teams")
	}
	if len(existingTeams) > 0 {
		return nil, apperror.Conflict("PLAYER_ALREADY_IN_GAME_TEAM", "Pemain sudah terdaftar di tim lain untuk game ini")
	}

	// Check not already a member of this team
	existingMember, err := s.teamMemberRepo.FindByTeamAndUser(ctx, teamID, userID)
	if err == nil && existingMember != nil {
		return nil, apperror.Conflict("MEMBER_ALREADY_IN_TEAM", "Pemain sudah menjadi anggota tim ini")
	}

	member := &model.TeamMember{
		ID:           uuid.New(),
		TeamID:       teamID,
		UserID:       &userID,
		InGameName:   inGameName,
		InGameID:     inGameID,
		Role:         role,
		JerseyNumber: jerseyNumber,
		JoinedAt:     time.Now(),
	}

	if err := s.teamMemberRepo.Create(ctx, member); err != nil {
		return nil, apperror.Wrap(err, "add member")
	}

	return member, nil
}

func (s *TeamService) RemoveMember(ctx context.Context, teamID, callerUserID, memberID uuid.UUID) error {
	team, err := s.teamRepo.FindByID(ctx, teamID)
	if err != nil || team == nil {
		return apperror.NotFound("TEAM")
	}

	if team.CaptainUserID == nil || *team.CaptainUserID != callerUserID {
		return apperror.New("FORBIDDEN", "Hanya kapten yang bisa mengeluarkan anggota tim", 403)
	}

	member, err := s.teamMemberRepo.FindByID(ctx, memberID)
	if err != nil || member == nil {
		return apperror.NotFound("TEAM_MEMBER")
	}

	if member.TeamID != teamID {
		return apperror.NotFound("TEAM_MEMBER")
	}

	// Cannot remove captain
	if member.Role == "captain" {
		return apperror.BusinessRule("CAPTAIN_CANNOT_LEAVE", "Kapten tidak dapat dikeluarkan dari tim")
	}

	if err := s.teamMemberRepo.Delete(ctx, memberID); err != nil {
		return apperror.Wrap(err, "remove member")
	}

	return nil
}

func (s *TeamService) GetMyTeams(ctx context.Context, userID uuid.UUID) ([]*model.Team, error) {
	// Use a broad filter and collect teams where user is a member
	// We query all teams and filter, or use a dedicated repo method
	// For now, use the team filter with no restrictions and find via member lookup
	filter := model.TeamFilter{
		Page:  1,
		Limit: 100,
	}
	teams, _, err := s.teamRepo.List(ctx, filter)
	if err != nil {
		return nil, apperror.Wrap(err, "list teams")
	}

	var myTeams []*model.Team
	for _, team := range teams {
		member, err := s.teamMemberRepo.FindByTeamAndUser(ctx, team.ID, userID)
		if err == nil && member != nil {
			myTeams = append(myTeams, team)
		}
	}

	return myTeams, nil
}

func (s *TeamService) Approve(ctx context.Context, teamID uuid.UUID) error {
	team, err := s.teamRepo.FindByID(ctx, teamID)
	if err != nil || team == nil {
		return apperror.NotFound("TEAM")
	}

	if err := s.teamRepo.UpdateStatus(ctx, teamID, "approved"); err != nil {
		return apperror.Wrap(err, "approve team")
	}

	return nil
}

func (s *TeamService) Reject(ctx context.Context, teamID uuid.UUID, reason string) error {
	team, err := s.teamRepo.FindByID(ctx, teamID)
	if err != nil || team == nil {
		return apperror.NotFound("TEAM")
	}

	if err := s.teamRepo.UpdateStatus(ctx, teamID, "rejected"); err != nil {
		return apperror.Wrap(err, "reject team")
	}

	return nil
}
