package service

import (
	"context"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/audit"
	"github.com/porjar-denpasar/porjar-api/internal/repository"
	"github.com/porjar-denpasar/porjar-api/internal/ws"
	"github.com/redis/go-redis/v9"
)

type TeamService struct {
	db             *pgxpool.Pool
	rdb            *redis.Client
	teamRepo       model.TeamRepository
	teamMemberRepo model.TeamMemberRepository
	gameRepo       model.GameRepository
	inviteRepo     model.TeamInviteRepository
	schoolRepo     model.SchoolRepository
	userRepo       model.UserRepository
	hub            *ws.Hub
	email          *EmailService
	badgeService   *BadgeService
}

// SetEmailService wires the email notification service (optional).
func (s *TeamService) SetEmailService(e *EmailService) { s.email = e }

func (s *TeamService) SetHub(h *ws.Hub) { s.hub = h }

func (s *TeamService) broadcastTeamUpdate(data interface{}) {
	if s.hub == nil {
		return
	}
	payload, err := ws.NewBroadcastData("team_update", data)
	if err != nil {
		slog.Error("failed to marshal team broadcast", "error", err)
		return
	}
	s.hub.BroadcastToAll(payload)
}

func NewTeamService(
	teamRepo model.TeamRepository,
	teamMemberRepo model.TeamMemberRepository,
	gameRepo model.GameRepository,
	db *pgxpool.Pool,
) *TeamService {
	return &TeamService{
		db:             db,
		teamRepo:       teamRepo,
		teamMemberRepo: teamMemberRepo,
		gameRepo:       gameRepo,
	}
}

// SetInviteRepo sets the invite repository (optional dependency).
func (s *TeamService) SetInviteRepo(repo model.TeamInviteRepository) {
	s.inviteRepo = repo
}

// SetRdb sets the Redis client (optional dependency, required for invite race-condition protection).
func (s *TeamService) SetRdb(rdb *redis.Client) {
	s.rdb = rdb
}

func (s *TeamService) SetSchoolRepo(repo model.SchoolRepository) {
	s.schoolRepo = repo
}

func (s *TeamService) SetUserRepo(repo model.UserRepository) {
	s.userRepo = repo
}

// SetBadgeService injects the badge service for fire-and-forget badge awards.
func (s *TeamService) SetBadgeService(bs *BadgeService) {
	s.badgeService = bs
}

func (s *TeamService) Create(ctx context.Context, name string, gameID, schoolID, captainUserID uuid.UUID) (*model.Team, error) {
	// Validate game exists
	game, err := s.gameRepo.FindByID(ctx, gameID)
	if err != nil {
		return nil, apperror.NotFound("GAME")
	}
	if game == nil {
		return nil, apperror.NotFound("GAME")
	}

	// Check user not already in a team for this game
	existingTeams, err := s.teamMemberRepo.FindUserTeamsForGame(ctx, captainUserID, gameID)
	if err != nil {
		return nil, apperror.Wrap(err, "check existing teams")
	}
	if len(existingTeams) > 0 {
		return nil, apperror.Conflict("PLAYER_ALREADY_IN_GAME_TEAM", "Anda sudah terdaftar di tim lain untuk game ini")
	}

	// Check unique name per game
	existing, err := s.teamRepo.FindByUserAndGame(ctx, captainUserID, gameID)
	if err == nil && existing != nil {
		return nil, apperror.Conflict("TEAM_NAME_EXISTS", "Nama tim sudah digunakan untuk game ini")
	}

	now := time.Now()
	team := &model.Team{
		ID:            uuid.New(),
		Name:          name,
		GameID:        gameID,
		SchoolID:      &schoolID,
		CaptainUserID: &captainUserID,
		Status:        "pending",
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	// Auto-add captain as member
	member := &model.TeamMember{
		ID:         uuid.New(),
		TeamID:     team.ID,
		UserID:     &captainUserID,
		InGameName: "",
		Role:       "captain",
		JoinedAt:   now,
	}

	// Create team + captain member atomically in a single transaction.
	// Falls back to non-transactional calls when db pool is unavailable (e.g. in unit tests).
	if s.db != nil {
		if err := repository.WithTx(ctx, s.db, func(tx pgx.Tx) error {
			if err := s.teamRepo.CreateTx(ctx, tx, team); err != nil {
				return apperror.Wrap(err, "create team")
			}
			if err := s.teamMemberRepo.CreateTx(ctx, tx, member); err != nil {
				return apperror.Wrap(err, "add captain as member")
			}
			return nil
		}); err != nil {
			return nil, err
		}
	} else {
		if err := s.teamRepo.Create(ctx, team); err != nil {
			return nil, apperror.Wrap(err, "create team")
		}
		if err := s.teamMemberRepo.Create(ctx, member); err != nil {
			return nil, apperror.Wrap(err, "add captain as member")
		}
	}

	audit.Log(ctx, audit.Entry{
		UserID:     &captainUserID,
		Action:     "team_created",
		EntityType: "team",
		EntityID:   &team.ID,
		Details: map[string]interface{}{
			"name":    team.Name,
			"game_id": gameID.String(),
		},
	})

	// Fire-and-forget: award "first-team" badge
	if s.badgeService != nil {
		go s.badgeService.AwardIfEligible(ctx, captainUserID, "first-team")
	}

	return team, nil
}

func (s *TeamService) GetByID(ctx context.Context, id uuid.UUID) (*model.Team, error) {
	team, err := s.teamRepo.FindByID(ctx, id)
	if err != nil {
		return nil, apperror.NotFound("TEAM")
	}
	if team == nil {
		return nil, apperror.NotFound("TEAM")
	}
	return team, nil
}

func (s *TeamService) GetByIDEnriched(ctx context.Context, id uuid.UUID) (*EnrichedTeam, error) {
	team, err := s.teamRepo.FindByID(ctx, id)
	if err != nil || team == nil {
		return nil, apperror.NotFound("TEAM")
	}
	enriched := s.enrichTeam(ctx, team)

	// Fetch full member list with user details
	members, err := s.teamMemberRepo.FindByTeam(ctx, id)
	if err == nil && members != nil {
		// Batch fetch all user IDs for members
		userIDSet := make(map[uuid.UUID]struct{})
		for _, m := range members {
			if m.UserID != nil {
				userIDSet[*m.UserID] = struct{}{}
			}
		}
		userMap := make(map[uuid.UUID]*model.User)
		if s.userRepo != nil && len(userIDSet) > 0 {
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

		for _, m := range members {
			em := EnrichedTeamMember{
				ID:         m.ID.String(),
				InGameName: m.InGameName,
				InGameID:   m.InGameID,
				Role:       m.Role,
			}
			if m.UserID != nil {
				if u, ok := userMap[*m.UserID]; ok {
					em.FullName = u.FullName
				}
			}
			enriched.Members = append(enriched.Members, em)
		}
	}

	return enriched, nil
}

func (s *TeamService) Update(ctx context.Context, id uuid.UUID, name string, logoURL *string, callerUserID uuid.UUID) (*model.Team, error) {
	team, err := s.teamRepo.FindByID(ctx, id)
	if err != nil || team == nil {
		return nil, apperror.NotFound("TEAM")
	}

	if team.CaptainUserID == nil || *team.CaptainUserID != callerUserID {
		return nil, apperror.New("FORBIDDEN", "Hanya kapten yang bisa mengubah tim", 403)
	}

	if name != "" {
		team.Name = name
	}
	if logoURL != nil {
		team.LogoURL = logoURL
	}
	team.UpdatedAt = time.Now()

	if err := s.teamRepo.Update(ctx, team); err != nil {
		return nil, apperror.Wrap(err, "update team")
	}

	return team, nil
}

func (s *TeamService) List(ctx context.Context, filter model.TeamFilter) ([]*model.Team, int, error) {
	teams, total, err := s.teamRepo.List(ctx, filter)
	if err != nil {
		return nil, 0, apperror.Wrap(err, "list teams")
	}
	return teams, total, nil
}

func (s *TeamService) Delete(ctx context.Context, teamID, captainUserID uuid.UUID) error {
	team, err := s.teamRepo.FindByID(ctx, teamID)
	if err != nil || team == nil {
		return apperror.NotFound("TEAM")
	}

	if team.CaptainUserID == nil || *team.CaptainUserID != captainUserID {
		return apperror.New("FORBIDDEN", "Hanya kapten yang bisa menghapus tim", 403)
	}

	count, err := s.teamRepo.CountActiveTournaments(ctx, teamID)
	if err != nil {
		return apperror.Wrap(err, "check active tournaments")
	}
	if count > 0 {
		return apperror.New("TEAM_HAS_ACTIVE_TOURNAMENTS", "Tim masih terdaftar di turnamen aktif. Selesaikan atau keluar dari turnamen terlebih dahulu.", 409)
	}

	if err := s.teamRepo.Delete(ctx, teamID); err != nil {
		return apperror.Wrap(err, "delete team")
	}
	return nil
}

func (s *TeamService) AdminUpdate(ctx context.Context, id uuid.UUID, name string, schoolID *uuid.UUID) (*model.Team, error) {
	team, err := s.teamRepo.FindByID(ctx, id)
	if err != nil || team == nil {
		return nil, apperror.NotFound("TEAM")
	}

	if name != "" {
		team.Name = name
	}
	if schoolID != nil {
		if s.schoolRepo != nil {
			school, err := s.schoolRepo.FindByID(ctx, *schoolID)
			if err != nil || school == nil {
				return nil, apperror.NotFound("SCHOOL")
			}
		}
		team.SchoolID = schoolID
	}
	team.UpdatedAt = time.Now()

	if err := s.teamRepo.Update(ctx, team); err != nil {
		return nil, apperror.Wrap(err, "admin update team")
	}
	return team, nil
}

func (s *TeamService) AdminDelete(ctx context.Context, teamID uuid.UUID) error {
	team, err := s.teamRepo.FindByID(ctx, teamID)
	if err != nil || team == nil {
		return apperror.NotFound("TEAM")
	}

	if err := s.teamRepo.Delete(ctx, teamID); err != nil {
		return apperror.Wrap(err, "admin delete team")
	}
	return nil
}
