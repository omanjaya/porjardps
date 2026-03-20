package service

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
)

// SubmitBRResult allows a participant to submit BR lobby result with screenshot evidence.
func (s *MatchSubmissionService) SubmitBRResult(
	ctx context.Context,
	lobbyID uuid.UUID,
	teamID uuid.UUID,
	submittedBy uuid.UUID,
	placement, kills int,
	screenshotURLs []string,
) (*model.MatchSubmission, error) {
	// Validate lobby exists
	lobby, err := s.brLobbyRepo.FindByID(ctx, lobbyID)
	if err != nil || lobby == nil {
		return nil, apperror.NotFound("LOBBY")
	}

	// Validate lobby status
	if lobby.Status != "live" && lobby.Status != "completed" && lobby.Status != "scheduled" {
		return nil, apperror.BusinessRule("LOBBY_NOT_ACTIVE", "Lobby harus berstatus live, scheduled, atau completed untuk submit hasil")
	}

	// Validate submitting user is a member of the team
	member, _ := s.teamMemberRepo.FindByTeamAndUser(ctx, teamID, submittedBy)
	if member == nil {
		return nil, apperror.BusinessRule("NOT_TEAM_MEMBER", "Anda bukan anggota tim ini")
	}

	// Validate screenshots provided
	if len(screenshotURLs) == 0 {
		return nil, apperror.ValidationError(map[string]string{
			"screenshot_urls": "Minimal satu screenshot bukti harus diupload",
		})
	}

	// Validate placement
	if placement < 1 {
		return nil, apperror.ValidationError(map[string]string{
			"placement": "Placement harus minimal 1",
		})
	}

	// Check no duplicate pending submission from same team
	existing, err := s.submissionRepo.FindByLobby(ctx, lobbyID)
	if err != nil {
		return nil, apperror.Wrap(err, "check existing lobby submissions")
	}
	for _, sub := range existing {
		if sub.TeamID == teamID && sub.Status == "pending" {
			return nil, apperror.Conflict("DUPLICATE_SUBMISSION", "Tim Anda sudah memiliki submission pending untuk lobby ini")
		}
	}

	submission := &model.MatchSubmission{
		ID:               uuid.New(),
		BRLobbyID:        &lobbyID,
		SubmittedBy:      submittedBy,
		TeamID:           teamID,
		ClaimedPlacement: &placement,
		ClaimedKills:     &kills,
		ScreenshotURLs:   screenshotURLs,
		Status:           "pending",
	}

	if err := s.submissionRepo.Create(ctx, submission); err != nil {
		return nil, apperror.Wrap(err, "create BR submission")
	}

	// Broadcast submission event
	s.broadcastSubmission(lobbyID, "br_submission_created", submission)

	return submission, nil
}

// applyApprovedBRSubmission updates the BR lobby result based on the approved submission.
func (s *MatchSubmissionService) applyApprovedBRSubmission(ctx context.Context, sub *model.MatchSubmission) error {
	kills := 0
	if sub.ClaimedKills != nil {
		kills = *sub.ClaimedKills
	}

	// Check if result already exists
	existingResult, _ := s.brResultRepo.FindByTeamAndLobby(ctx, sub.TeamID, *sub.BRLobbyID)
	if existingResult != nil {
		// Update existing
		existingResult.Placement = *sub.ClaimedPlacement
		existingResult.Kills = kills
		if err := s.brResultRepo.Update(ctx, existingResult); err != nil {
			return fmt.Errorf("update BR result: %w", err)
		}
	} else {
		// Create new result
		result := &model.BRLobbyResult{
			ID:        uuid.New(),
			LobbyID:   *sub.BRLobbyID,
			TeamID:    sub.TeamID,
			Placement: *sub.ClaimedPlacement,
			Kills:     kills,
			Status:    "confirmed",
		}
		if err := s.brResultRepo.Create(ctx, result); err != nil {
			return fmt.Errorf("create BR result: %w", err)
		}
	}

	return nil
}
