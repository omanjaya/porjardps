package service

import (
	"context"
	"log/slog"

	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
	"github.com/porjar-denpasar/porjar-api/internal/ws"
)

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
	bracketService  *BracketService
	brService       *BRService
	notificationSvc *NotificationService
	hub             *ws.Hub
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
	}
}

// SubmitUnified is a unified submit endpoint that accepts 'team_a'/'team_b' winner notation
// and routes to the correct bracket or BR submission handler.
func (s *MatchSubmissionService) SubmitUnified(
	ctx context.Context,
	userID uuid.UUID,
	matchID string,
	matchType string,
	claimedWinner string,
	scoreA, scoreB, placement, kills int,
	screenshots []string,
) (*model.MatchSubmission, error) {
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
		if match.TeamAID == nil || match.TeamBID == nil {
			return nil, apperror.BusinessRule("MATCH_NOT_READY", "Match belum memiliki peserta")
		}
		memberA, _ := s.teamMemberRepo.FindByTeamAndUser(ctx, *match.TeamAID, userID)
		memberB, _ := s.teamMemberRepo.FindByTeamAndUser(ctx, *match.TeamBID, userID)
		var userTeamID uuid.UUID
		if memberA != nil {
			userTeamID = *match.TeamAID
		} else if memberB != nil {
			userTeamID = *match.TeamBID
		} else {
			return nil, apperror.BusinessRule("NOT_PARTICIPANT", "Anda bukan peserta match ini")
		}
		var winnerID uuid.UUID
		if claimedWinner == "team_a" {
			winnerID = *match.TeamAID
		} else if claimedWinner == "team_b" {
			winnerID = *match.TeamBID
		} else {
			return nil, apperror.ValidationError(map[string]string{"claimed_winner": "Harus 'team_a' atau 'team_b'"})
		}
		return s.SubmitBracketResult(ctx, id, userTeamID, userID, winnerID, scoreA, scoreB, screenshots)

	case "battle_royale":
		lobby, err := s.brLobbyRepo.FindByID(ctx, id)
		if err != nil || lobby == nil {
			return nil, apperror.NotFound("LOBBY")
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
			return nil, apperror.BusinessRule("NOT_PARTICIPANT", "Tim Anda bukan peserta lobby ini")
		}
		return s.SubmitBRResult(ctx, id, userTeamID, userID, placement, kills, screenshots)

	default:
		return nil, apperror.ValidationError(map[string]string{"match_type": "Harus 'bracket' atau 'battle_royale'"})
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

// EnrichSubmissions converts raw submissions into AdminSubmissionDTOs with display names.
func (s *MatchSubmissionService) EnrichSubmissions(ctx context.Context, subs []*model.MatchSubmission) ([]*model.AdminSubmissionDTO, error) {
	if len(subs) == 0 {
		return []*model.AdminSubmissionDTO{}, nil
	}

	// Collect unique IDs
	teamIDSet := make(map[uuid.UUID]bool)
	userIDSet := make(map[uuid.UUID]bool)
	bracketMatchIDSet := make(map[uuid.UUID]bool)

	for _, sub := range subs {
		teamIDSet[sub.TeamID] = true
		userIDSet[sub.SubmittedBy] = true
		if sub.BracketMatchID != nil {
			bracketMatchIDSet[*sub.BracketMatchID] = true
		}
	}

	// Batch-fetch teams
	teamIDs := make([]uuid.UUID, 0, len(teamIDSet))
	for id := range teamIDSet {
		teamIDs = append(teamIDs, id)
	}
	teams, err := s.teamRepo.FindByIDs(ctx, teamIDs)
	if err != nil {
		slog.Error("EnrichSubmissions: failed to batch-fetch teams", "error", err)
	}
	teamMap := make(map[uuid.UUID]string, len(teams))
	teamGameMap := make(map[uuid.UUID]uuid.UUID, len(teams))
	for _, t := range teams {
		teamMap[t.ID] = t.Name
		teamGameMap[t.ID] = t.GameID
	}

	// Batch-fetch users
	userIDs := make([]uuid.UUID, 0, len(userIDSet))
	for id := range userIDSet {
		userIDs = append(userIDs, id)
	}
	users, err := s.userRepo.FindByIDs(ctx, userIDs)
	if err != nil {
		slog.Error("EnrichSubmissions: failed to batch-fetch users", "error", err)
	}
	userMap := make(map[uuid.UUID]string, len(users))
	for _, u := range users {
		userMap[u.ID] = u.FullName
	}

	// Batch-fetch bracket matches for team_a/team_b names
	bracketMatchIDs := make([]uuid.UUID, 0, len(bracketMatchIDSet))
	for id := range bracketMatchIDSet {
		bracketMatchIDs = append(bracketMatchIDs, id)
	}
	bracketMatches, err := s.bracketRepo.FindByIDs(ctx, bracketMatchIDs)
	if err != nil {
		slog.Error("EnrichSubmissions: failed to batch-fetch bracket matches", "error", err)
	}
	bracketMap := make(map[uuid.UUID]*model.BracketMatch, len(bracketMatches))
	for _, bm := range bracketMatches {
		bracketMap[bm.ID] = bm
		if bm.TeamAID != nil {
			teamIDSet[*bm.TeamAID] = true
		}
		if bm.TeamBID != nil {
			teamIDSet[*bm.TeamBID] = true
		}
	}

	// Re-fetch teams if bracket matches added new team IDs
	if len(teamIDSet) > len(teamIDs) {
		allTeamIDs := make([]uuid.UUID, 0, len(teamIDSet))
		for id := range teamIDSet {
			allTeamIDs = append(allTeamIDs, id)
		}
		allTeams, err := s.teamRepo.FindByIDs(ctx, allTeamIDs)
		if err != nil {
			slog.Error("EnrichSubmissions: failed to re-fetch teams", "error", err)
		}
		for _, t := range allTeams {
			teamMap[t.ID] = t.Name
			teamGameMap[t.ID] = t.GameID
		}
	}

	// Collect game IDs from teams
	gameIDSet := make(map[uuid.UUID]bool)
	for _, gid := range teamGameMap {
		gameIDSet[gid] = true
	}
	gameIDs := make([]uuid.UUID, 0, len(gameIDSet))
	for id := range gameIDSet {
		gameIDs = append(gameIDs, id)
	}
	games, err := s.gameRepo.FindByIDs(ctx, gameIDs)
	if err != nil {
		slog.Error("EnrichSubmissions: failed to batch-fetch games", "error", err)
	}
	gameMap := make(map[uuid.UUID]string, len(games))
	for _, g := range games {
		gameMap[g.ID] = g.Name
	}

	// Build DTOs
	result := make([]*model.AdminSubmissionDTO, len(subs))
	for i, sub := range subs {
		dto := &model.AdminSubmissionDTO{
			MatchSubmission: *sub,
			TeamName:        teamMap[sub.TeamID],
			SubmittedByName: userMap[sub.SubmittedBy],
		}
		// Game name from the submitting team
		if gid, ok := teamGameMap[sub.TeamID]; ok {
			dto.GameName = gameMap[gid]
		}
		// team_a / team_b from bracket match
		if sub.BracketMatchID != nil {
			if bm, ok := bracketMap[*sub.BracketMatchID]; ok {
				if bm.TeamAID != nil {
					dto.TeamAName = teamMap[*bm.TeamAID]
				}
				if bm.TeamBID != nil {
					dto.TeamBName = teamMap[*bm.TeamBID]
				}
			}
		}
		result[i] = dto
	}
	return result, nil
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

// CanAccessSubmission checks whether the given user (with the given role) is
// authorised to view a submission. Access is granted when the user is the
// original submitter, a member of the submitting team, or an admin.
func (s *MatchSubmissionService) CanAccessSubmission(ctx context.Context, sub *model.MatchSubmission, userID uuid.UUID, role string) bool {
	if role == "admin" || role == "superadmin" {
		return true
	}
	if sub.SubmittedBy == userID {
		return true
	}
	member, _ := s.teamMemberRepo.FindByTeamAndUser(ctx, sub.TeamID, userID)
	return member != nil
}

// GetSubmissionsByMatch returns all submissions for a given bracket match.
func (s *MatchSubmissionService) GetSubmissionsByMatch(ctx context.Context, matchID uuid.UUID) ([]*model.MatchSubmission, error) {
	subs, err := s.submissionRepo.FindByMatch(ctx, matchID)
	if err != nil {
		return nil, apperror.Wrap(err, "get submissions by match")
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

// DisputeSubmission marks a submission as disputed.
func (s *MatchSubmissionService) DisputeSubmission(ctx context.Context, submissionID uuid.UUID, reason string) error {
	submission, err := s.submissionRepo.FindByID(ctx, submissionID)
	if err != nil || submission == nil {
		return apperror.NotFound("SUBMISSION")
	}

	if submission.Status != "pending" {
		return apperror.BusinessRule("CANNOT_DISPUTE", "Hanya submission pending yang dapat di-dispute")
	}

	notes := reason
	if err := s.submissionRepo.UpdateStatus(ctx, submissionID, "disputed", nil, nil, &notes); err != nil {
		return apperror.Wrap(err, "dispute submission")
	}

	return nil
}
