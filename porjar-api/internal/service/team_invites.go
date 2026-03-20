package service

import (
	"context"
	"crypto/rand"
	"math/big"
	"time"

	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
)

// GenerateInviteLink creates a new invite code for a team. Only the captain can do this.
func (s *TeamService) GenerateInviteLink(ctx context.Context, teamID, captainUserID uuid.UUID, maxUses int, expiresIn time.Duration) (string, *model.TeamInvite, error) {
	if s.inviteRepo == nil {
		return "", nil, apperror.New("FEATURE_UNAVAILABLE", "Fitur invite belum tersedia", 501)
	}

	team, err := s.teamRepo.FindByID(ctx, teamID)
	if err != nil || team == nil {
		return "", nil, apperror.NotFound("TEAM")
	}

	// Verify captain owns the team
	if team.CaptainUserID == nil || *team.CaptainUserID != captainUserID {
		return "", nil, apperror.BusinessRule("NOT_CAPTAIN", "Hanya kapten yang dapat membuat link invite")
	}

	code, err := generateInviteCode(8)
	if err != nil {
		return "", nil, apperror.Wrap(err, "generate invite code")
	}

	now := time.Now()
	invite := &model.TeamInvite{
		ID:         uuid.New(),
		TeamID:     teamID,
		InviteCode: code,
		CreatedBy:  captainUserID,
		MaxUses:    maxUses,
		UsedCount:  0,
		ExpiresAt:  now.Add(expiresIn),
		IsActive:   true,
		CreatedAt:  now,
	}

	if err := s.inviteRepo.Create(ctx, invite); err != nil {
		return "", nil, apperror.Wrap(err, "create invite")
	}

	return code, invite, nil
}

// JoinViaInvite allows a user to join a team using an invite code.
func (s *TeamService) JoinViaInvite(ctx context.Context, inviteCode string, userID uuid.UUID, inGameName string, inGameID *string) error {
	if s.inviteRepo == nil {
		return apperror.New("FEATURE_UNAVAILABLE", "Fitur invite belum tersedia", 501)
	}

	invite, err := s.inviteRepo.FindByCode(ctx, inviteCode)
	if err != nil {
		return apperror.Wrap(err, "find invite")
	}
	if invite == nil {
		return apperror.NotFound("INVITE")
	}

	// Validate invite is active
	if !invite.IsActive {
		return apperror.BusinessRule("INVITE_INACTIVE", "Link invite sudah tidak aktif")
	}

	// Validate not expired
	if time.Now().After(invite.ExpiresAt) {
		return apperror.BusinessRule("INVITE_EXPIRED", "Link invite sudah kedaluwarsa")
	}

	// Validate max uses (0 means unlimited)
	if invite.MaxUses > 0 && invite.UsedCount >= invite.MaxUses {
		return apperror.BusinessRule("INVITE_MAX_USED", "Link invite sudah mencapai batas penggunaan")
	}

	// Get the team
	team, err := s.teamRepo.FindByID(ctx, invite.TeamID)
	if err != nil || team == nil {
		return apperror.NotFound("TEAM")
	}

	// Get game to check max members
	game, err := s.gameRepo.FindByID(ctx, team.GameID)
	if err != nil || game == nil {
		return apperror.NotFound("GAME")
	}

	// Check team not full
	memberCount, err := s.teamMemberRepo.CountByTeam(ctx, team.ID)
	if err != nil {
		return apperror.Wrap(err, "count members")
	}
	maxTotal := game.MaxTeamMembers + game.MaxSubstitutes
	if memberCount >= maxTotal {
		return apperror.BusinessRule("TEAM_FULL", "Tim sudah penuh")
	}

	// Check user not already in a team for this game
	existingTeams, err := s.teamMemberRepo.FindUserTeamsForGame(ctx, userID, team.GameID)
	if err != nil {
		return apperror.Wrap(err, "check user game teams")
	}
	if len(existingTeams) > 0 {
		return apperror.Conflict("PLAYER_ALREADY_IN_GAME_TEAM", "Anda sudah terdaftar di tim lain untuk game ini")
	}

	// Add as member
	member := &model.TeamMember{
		ID:         uuid.New(),
		TeamID:     team.ID,
		UserID:     &userID,
		InGameName: inGameName,
		InGameID:   inGameID,
		Role:       "member",
		JoinedAt:   time.Now(),
	}

	if err := s.teamMemberRepo.Create(ctx, member); err != nil {
		return apperror.Wrap(err, "add member via invite")
	}

	// Increment used count
	if err := s.inviteRepo.IncrementUsed(ctx, invite.ID); err != nil {
		return apperror.Wrap(err, "increment invite used")
	}

	return nil
}

// GetTeamInvites returns active invites for a team.
func (s *TeamService) GetTeamInvites(ctx context.Context, teamID, userID uuid.UUID) ([]*model.TeamInvite, error) {
	if s.inviteRepo == nil {
		return nil, apperror.New("FEATURE_UNAVAILABLE", "Fitur invite belum tersedia", 501)
	}

	team, err := s.teamRepo.FindByID(ctx, teamID)
	if err != nil || team == nil {
		return nil, apperror.NotFound("TEAM")
	}

	if team.CaptainUserID == nil || *team.CaptainUserID != userID {
		return nil, apperror.BusinessRule("NOT_CAPTAIN", "Hanya kapten yang dapat melihat invite")
	}

	invites, err := s.inviteRepo.FindByTeam(ctx, teamID)
	if err != nil {
		return nil, apperror.Wrap(err, "list invites")
	}

	return invites, nil
}

// DeactivateInvite deactivates a specific invite.
func (s *TeamService) DeactivateInvite(ctx context.Context, teamID, inviteID, userID uuid.UUID) error {
	if s.inviteRepo == nil {
		return apperror.New("FEATURE_UNAVAILABLE", "Fitur invite belum tersedia", 501)
	}

	team, err := s.teamRepo.FindByID(ctx, teamID)
	if err != nil || team == nil {
		return apperror.NotFound("TEAM")
	}

	if team.CaptainUserID == nil || *team.CaptainUserID != userID {
		return apperror.BusinessRule("NOT_CAPTAIN", "Hanya kapten yang dapat menonaktifkan invite")
	}

	if err := s.inviteRepo.Deactivate(ctx, inviteID); err != nil {
		return apperror.Wrap(err, "deactivate invite")
	}

	return nil
}

// GetInviteInfo returns public info about a team from an invite code.
func (s *TeamService) GetInviteInfo(ctx context.Context, code string) (map[string]interface{}, error) {
	if s.inviteRepo == nil {
		return nil, apperror.New("FEATURE_UNAVAILABLE", "Fitur invite belum tersedia", 501)
	}

	invite, err := s.inviteRepo.FindByCode(ctx, code)
	if err != nil {
		return nil, apperror.Wrap(err, "find invite")
	}
	if invite == nil {
		return nil, apperror.NotFound("INVITE")
	}

	if !invite.IsActive {
		return nil, apperror.BusinessRule("INVITE_INACTIVE", "Link invite sudah tidak aktif")
	}

	team, err := s.teamRepo.FindByID(ctx, invite.TeamID)
	if err != nil || team == nil {
		return nil, apperror.NotFound("TEAM")
	}

	game, err := s.gameRepo.FindByID(ctx, team.GameID)
	if err != nil || game == nil {
		return nil, apperror.NotFound("GAME")
	}

	memberCount, _ := s.teamMemberRepo.CountByTeam(ctx, team.ID)
	maxMembers := game.MaxTeamMembers + game.MaxSubstitutes

	return map[string]interface{}{
		"team_id":      team.ID,
		"team_name":    team.Name,
		"game_name":    game.Name,
		"game_slug":    game.Slug,
		"school_id":    team.SchoolID,
		"member_count": memberCount,
		"max_members":  maxMembers,
		"expires_at":   invite.ExpiresAt,
		"is_full":      memberCount >= maxMembers,
	}, nil
}

// generateInviteCode creates a random alphanumeric code of the given length.
func generateInviteCode(length int) (string, error) {
	const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	result := make([]byte, length)
	for i := 0; i < length; i++ {
		n, err := rand.Int(rand.Reader, big.NewInt(int64(len(chars))))
		if err != nil {
			return "", err
		}
		result[i] = chars[n.Int64()]
	}
	return string(result), nil
}
