package service

import (
	"context"
	"log/slog"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/audit"
)

// notifyCaptain dispatches an approval/rejection email to the captain in a
// background goroutine. Failures are logged, never returned to the caller.
func (s *TeamService) notifyCaptain(team *model.Team, action, reason string) {
	if s.email == nil || s.userRepo == nil || team == nil || team.CaptainUserID == nil {
		return
	}
	captainID := *team.CaptainUserID
	teamName := team.Name
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()
		user, err := s.userRepo.FindByID(ctx, captainID)
		if err != nil || user == nil || user.Email == "" {
			slog.Warn("team notify: captain lookup failed", "team_id", team.ID, "err", err)
			return
		}
		switch action {
		case "approved":
			if err := s.email.SendTeamApproved(ctx, user.Email, user.FullName, teamName); err != nil {
				slog.Error("team notify: send approved failed", "err", err)
			}
		case "rejected":
			if err := s.email.SendTeamRejected(ctx, user.Email, user.FullName, teamName, reason); err != nil {
				slog.Error("team notify: send rejected failed", "err", err)
			}
		}
	}()
}

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
		return nil, apperror.BusinessRule("TEAM_FULL", "Tim sudah penuh, maksimal "+strconv.Itoa(maxTotal)+" anggota")
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

// AdminAddMember adds a member to a team, bypassing the captain-only check.
func (s *TeamService) AdminAddMember(ctx context.Context, teamID, userID uuid.UUID, inGameName string, inGameID *string, role string, jerseyNumber *int) (*model.TeamMember, error) {
	team, err := s.teamRepo.FindByID(ctx, teamID)
	if err != nil || team == nil {
		return nil, apperror.NotFound("TEAM")
	}

	game, err := s.gameRepo.FindByID(ctx, team.GameID)
	if err != nil || game == nil {
		return nil, apperror.NotFound("GAME")
	}

	memberCount, err := s.teamMemberRepo.CountByTeam(ctx, teamID)
	if err != nil {
		return nil, apperror.Wrap(err, "count members")
	}
	maxTotal := game.MaxTeamMembers + game.MaxSubstitutes
	if memberCount >= maxTotal {
		return nil, apperror.BusinessRule("TEAM_FULL", "Tim sudah penuh, maksimal "+strconv.Itoa(maxTotal)+" anggota")
	}

	existingTeams, err := s.teamMemberRepo.FindUserTeamsForGame(ctx, userID, team.GameID)
	if err != nil {
		return nil, apperror.Wrap(err, "check user game teams")
	}
	if len(existingTeams) > 0 {
		return nil, apperror.Conflict("PLAYER_ALREADY_IN_GAME_TEAM", "Pemain sudah terdaftar di tim lain untuk game ini")
	}

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
		return nil, apperror.Wrap(err, "admin add member")
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
	memberships, err := s.teamMemberRepo.FindByUser(ctx, userID)
	if err != nil {
		return nil, apperror.Wrap(err, "find user memberships")
	}
	if len(memberships) == 0 {
		return []*model.Team{}, nil
	}

	teamIDs := make([]uuid.UUID, 0, len(memberships))
	for _, m := range memberships {
		teamIDs = append(teamIDs, m.TeamID)
	}

	teams, err := s.teamRepo.FindByIDs(ctx, teamIDs)
	if err != nil {
		return nil, apperror.Wrap(err, "batch fetch teams")
	}

	return teams, nil
}

func (s *TeamService) Approve(ctx context.Context, teamID uuid.UUID) error {
	team, err := s.teamRepo.FindByID(ctx, teamID)
	if err != nil || team == nil {
		return apperror.NotFound("TEAM")
	}

	if err := s.teamRepo.UpdateStatus(ctx, teamID, "approved"); err != nil {
		return apperror.Wrap(err, "approve team")
	}

	s.broadcastTeamUpdate(map[string]interface{}{
		"team_id": teamID.String(),
		"action":  "approved",
	})

	audit.Log(ctx, audit.Entry{
		Action:     "team_approved",
		EntityType: "team",
		EntityID:   &teamID,
		Details:    map[string]interface{}{"name": team.Name},
	})

	s.notifyCaptain(team, "approved", "")

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

	s.broadcastTeamUpdate(map[string]interface{}{
		"team_id": teamID.String(),
		"action":  "rejected",
	})

	audit.Log(ctx, audit.Entry{
		Action:     "team_rejected",
		EntityType: "team",
		EntityID:   &teamID,
		Details: map[string]interface{}{
			"name":   team.Name,
			"reason": reason,
		},
	})

	s.notifyCaptain(team, "rejected", reason)

	return nil
}
