package service

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/audit"
	"github.com/porjar-denpasar/porjar-api/internal/ws"
	"github.com/redis/go-redis/v9"
)

// PushSender is a minimal interface for sending push notifications to all subscribers.
type PushSender interface {
	SendPushToAll(ctx context.Context, title, body, url string)
}

type MatchSubmissionService struct {
	submissionRepo  model.MatchSubmissionRepository
	bracketRepo     model.BracketRepository
	brLobbyRepo     model.BRLobbyRepository
	brResultRepo    model.BRLobbyResultRepository
	teamRepo        model.TeamRepository
	teamMemberRepo  model.TeamMemberRepository
	brLobbyTeamRepo model.BRLobbyTeamRepository
	gameRepo        model.GameRepository
	userRepo        model.UserRepository
	tournamentRepo  model.TournamentRepository
	groupRepo       model.GroupRepository
	bracketService  *BracketService
	brService       *BRService
	groupService    *GroupService
	notificationSvc *NotificationService
	pushSender      PushSender
	hub             *ws.Hub
	rdb             *redis.Client
}

func NewMatchSubmissionService(
	submissionRepo model.MatchSubmissionRepository,
	bracketRepo model.BracketRepository,
	brLobbyRepo model.BRLobbyRepository,
	brResultRepo model.BRLobbyResultRepository,
	teamRepo model.TeamRepository,
	teamMemberRepo model.TeamMemberRepository,
	brLobbyTeamRepo model.BRLobbyTeamRepository,
	gameRepo model.GameRepository,
	userRepo model.UserRepository,
	bracketService *BracketService,
	brService *BRService,
	notificationSvc *NotificationService,
	hub *ws.Hub,
	rdb *redis.Client,
) *MatchSubmissionService {
	return &MatchSubmissionService{
		submissionRepo:  submissionRepo,
		bracketRepo:     bracketRepo,
		brLobbyRepo:     brLobbyRepo,
		brResultRepo:    brResultRepo,
		teamRepo:        teamRepo,
		teamMemberRepo:  teamMemberRepo,
		brLobbyTeamRepo: brLobbyTeamRepo,
		gameRepo:        gameRepo,
		userRepo:        userRepo,
		bracketService:  bracketService,
		brService:       brService,
		notificationSvc: notificationSvc,
		hub:             hub,
		rdb:             rdb,
	}
}

func (s *MatchSubmissionService) SetTournamentRepo(repo model.TournamentRepository) {
	s.tournamentRepo = repo
}

func (s *MatchSubmissionService) SetPushSender(p PushSender) {
	s.pushSender = p
}

func (s *MatchSubmissionService) SetGroupRepo(r model.GroupRepository) {
	s.groupRepo = r
}

func (s *MatchSubmissionService) SetGroupService(svc *GroupService) {
	s.groupService = svc
}

// SubmitUnified is a unified submit endpoint that accepts 'team_a'/'team_b' winner notation
// and routes to the correct bracket or BR submission handler.
func (s *MatchSubmissionService) SubmitUnified(
	ctx context.Context,
	userID uuid.UUID,
	matchID string,
	matchType string,
	claimedWinner string,
	mapNumber int,
	scoreA, scoreB, placement, killsP1, killsP2, killsP3, killsP4 int,
	screenshots []string,
) (sub *model.MatchSubmission, err error) {
	defer func() {
		if err == nil && sub != nil {
			audit.Log(ctx, audit.Entry{
				UserID:     &userID,
				Action:     "match_submission_created",
				EntityType: "match_submission",
				EntityID:   &sub.ID,
				Details: map[string]interface{}{
					"match_type": matchType,
					"match_id":   matchID,
				},
			})
		}
	}()
	id, err := uuid.Parse(matchID)
	if err != nil {
		return nil, apperror.ValidationError(map[string]string{"match_id": "Match ID tidak valid"})
	}
	if len(screenshots) == 0 {
		return nil, apperror.ValidationError(map[string]string{"screenshots": "Minimal satu screenshot harus diupload"})
	}

	switch matchType {
	case "bracket":
		match, err := s.bracketRepo.FindByID(ctx, id)
		if err != nil || match == nil {
			return nil, apperror.NotFound("MATCH")
		}
		// Generic denial message to prevent enumeration of match/team relationships
		const denied = "Anda tidak dapat submit hasil untuk match ini"
		if match.Status != "live" && !s.isTournamentLiveNow(ctx, match.TournamentID) {
			return nil, apperror.BusinessRule("SUBMIT_DENIED", denied)
		}
		if match.TeamAID == nil || match.TeamBID == nil {
			return nil, apperror.BusinessRule("SUBMIT_DENIED", denied)
		}
		memberA, _ := s.teamMemberRepo.FindByTeamAndUser(ctx, *match.TeamAID, userID)
		memberB, _ := s.teamMemberRepo.FindByTeamAndUser(ctx, *match.TeamBID, userID)
		var userTeamID uuid.UUID
		if memberA != nil {
			userTeamID = *match.TeamAID
		} else if memberB != nil {
			userTeamID = *match.TeamBID
		} else {
			return nil, apperror.BusinessRule("SUBMIT_DENIED", denied)
		}
		// Per-game screenshot limit
		gameSlug, _ := s.getGameSlugForTeam(ctx, userTeamID)
		bestOf := match.BestOf
		if bestOf <= 0 {
			bestOf = 1
		}
		maxSS := gameMaxScreenshots(gameSlug, "bracket", bestOf)
		if len(screenshots) > maxSS {
			return nil, apperror.ValidationError(map[string]string{
				"screenshots": fmt.Sprintf("Maksimal %d screenshot untuk game ini", maxSS),
			})
		}
		// Winner is auto-derived from score in SubmitBracketResult
		return s.SubmitBracketResult(ctx, id, userTeamID, userID, scoreA, scoreB, screenshots)

	case "battle_royale":
		lobby, err := s.brLobbyRepo.FindByID(ctx, id)
		if err != nil || lobby == nil {
			return nil, apperror.NotFound("LOBBY")
		}
		const brDenied = "Anda tidak dapat submit hasil untuk lobby ini"
		if lobby.Status != "live" && !s.isTournamentLiveNow(ctx, lobby.TournamentID) {
			return nil, apperror.BusinessRule("SUBMIT_DENIED", brDenied)
		}
		lobbyTeams, _ := s.brLobbyTeamRepo.FindByLobby(ctx, id)
		var userTeamID uuid.UUID
		found := false
		for _, lt := range lobbyTeams {
			member, _ := s.teamMemberRepo.FindByTeamAndUser(ctx, lt.TeamID, userID)
			if member != nil {
				userTeamID = lt.TeamID
				found = true
				break
			}
		}
		if !found {
			return nil, apperror.BusinessRule("SUBMIT_DENIED", brDenied)
		}
		mn := mapNumber
		if mn <= 0 {
			mn = 1
		}
		return s.SubmitBRResult(ctx, id, userTeamID, userID, mn, placement, killsP1, killsP2, killsP3, killsP4, screenshots)

	case "group":
		if s.groupRepo == nil {
			return nil, apperror.BusinessRule("GROUP_NOT_SUPPORTED", "Fitur grup belum diaktifkan")
		}
		gm, err := s.groupRepo.FindMatchByID(ctx, id)
		if err != nil || gm == nil {
			return nil, apperror.NotFound("MATCH")
		}
		const groupDenied = "Anda tidak dapat submit hasil untuk match ini"
		if gm.Status != "live" {
			return nil, apperror.BusinessRule("SUBMIT_DENIED", groupDenied)
		}
		if gm.TeamAID == nil || gm.TeamBID == nil {
			return nil, apperror.BusinessRule("SUBMIT_DENIED", groupDenied)
		}
		memberA, _ := s.teamMemberRepo.FindByTeamAndUser(ctx, *gm.TeamAID, userID)
		memberB, _ := s.teamMemberRepo.FindByTeamAndUser(ctx, *gm.TeamBID, userID)
		var userTeamID uuid.UUID
		if memberA != nil {
			userTeamID = *gm.TeamAID
		} else if memberB != nil {
			userTeamID = *gm.TeamBID
		} else {
			return nil, apperror.BusinessRule("SUBMIT_DENIED", groupDenied)
		}
		// Per-game screenshot limit (use group default)
		maxSS := 5
		if len(screenshots) > maxSS {
			return nil, apperror.ValidationError(map[string]string{
				"screenshots": fmt.Sprintf("Maksimal %d screenshot untuk game ini", maxSS),
			})
		}
		return s.SubmitGroupResult(ctx, id, userTeamID, userID, scoreA, scoreB, screenshots, 1)

	default:
		return nil, apperror.ValidationError(map[string]string{"match_type": "Harus 'bracket', 'battle_royale', atau 'group'"})
	}
}

// GetPendingSubmissions returns paginated pending submissions for admin dashboard.
func (s *MatchSubmissionService) GetPendingSubmissions(ctx context.Context, page, limit int) ([]*model.MatchSubmission, int, error) {
	subs, total, err := s.submissionRepo.FindPending(ctx, page, limit)
	if err != nil {
		return nil, 0, apperror.Wrap(err, "get pending submissions")
	}
	return subs, total, nil
}

// ListSubmissions lists submissions with filters.
func (s *MatchSubmissionService) ListSubmissions(ctx context.Context, filter model.MatchSubmissionFilter) ([]*model.MatchSubmission, int, error) {
	subs, total, err := s.submissionRepo.List(ctx, filter)
	if err != nil {
		return nil, 0, apperror.Wrap(err, "list submissions")
	}
	return subs, total, nil
}

// GetSubmission returns a single submission by ID.
func (s *MatchSubmissionService) GetSubmission(ctx context.Context, id uuid.UUID) (*model.MatchSubmission, error) {
	sub, err := s.submissionRepo.FindByID(ctx, id)
	if err != nil || sub == nil {
		return nil, apperror.NotFound("SUBMISSION")
	}
	return sub, nil
}

// GetSubmissionsByMatch returns all submissions for a given bracket match.
func (s *MatchSubmissionService) GetSubmissionsByMatch(ctx context.Context, matchID uuid.UUID) ([]*model.MatchSubmission, error) {
	subs, err := s.submissionRepo.FindByMatch(ctx, matchID)
	if err != nil {
		return nil, apperror.Wrap(err, "get submissions by match")
	}
	return subs, nil
}

// GetSubmissionsByLobby returns all submissions for a given BR lobby.
func (s *MatchSubmissionService) GetSubmissionsByLobby(ctx context.Context, lobbyID uuid.UUID) ([]*model.MatchSubmission, error) {
	subs, err := s.submissionRepo.FindByLobby(ctx, lobbyID)
	if err != nil {
		return nil, apperror.Wrap(err, "get submissions by lobby")
	}
	return subs, nil
}

// GetSubmissionsByTeam returns all submissions for a given team.
func (s *MatchSubmissionService) GetSubmissionsByTeam(ctx context.Context, teamID uuid.UUID) ([]*model.MatchSubmission, error) {
	subs, err := s.submissionRepo.FindByTeam(ctx, teamID)
	if err != nil {
		return nil, apperror.Wrap(err, "get submissions by team")
	}
	return subs, nil
}

// GetSubmissionsByGroupMatch returns all submissions for a given group match.
func (s *MatchSubmissionService) GetSubmissionsByGroupMatch(ctx context.Context, groupMatchID uuid.UUID) ([]*model.MatchSubmission, error) {
	return s.submissionRepo.FindByGroupMatch(ctx, groupMatchID)
}
