package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"sync"

	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
	"github.com/porjar-denpasar/porjar-api/internal/ws"
)

// autoVerifyLocks prevents concurrent AutoVerify calls for the same matchID from both
// passing the "both teams submitted" check and double-applying the result.
var autoVerifyLocks sync.Map

// VerifySubmission allows an admin to approve or reject a submission.
func (s *MatchSubmissionService) VerifySubmission(
	ctx context.Context,
	submissionID uuid.UUID,
	adminID uuid.UUID,
	approved bool,
	rejectionReason string,
) error {
	submission, err := s.submissionRepo.FindByID(ctx, submissionID)
	if err != nil || submission == nil {
		return apperror.NotFound("SUBMISSION")
	}

	if submission.Status != "pending" && submission.Status != "disputed" {
		return apperror.BusinessRule("ALREADY_VERIFIED", "Submission sudah diverifikasi sebelumnya")
	}

	var status string
	var rejReason *string
	if approved {
		status = "approved"
	} else {
		status = "rejected"
		if rejectionReason != "" {
			rejReason = &rejectionReason
		}
	}

	if err := s.submissionRepo.UpdateStatus(ctx, submissionID, status, &adminID, rejReason, nil); err != nil {
		return apperror.Wrap(err, "update submission status")
	}

	// If approved, auto-update the actual match/lobby results
	if approved {
		if err := s.applyApprovedSubmission(ctx, submission); err != nil {
			slog.Error("failed to apply approved submission", "submission_id", submissionID, "error", err)
		}
	}

	// Notify the submitting team
	team, _ := s.teamRepo.FindByID(ctx, submission.TeamID)
	teamName := "Tim"
	if team != nil {
		teamName = team.Name
	}

	if s.notificationSvc != nil {
		if approved {
			data, _ := json.Marshal(map[string]string{"submission_id": submissionID.String()})
			if err := s.notificationSvc.Create(ctx, submission.SubmittedBy, "submission_approved",
				"Hasil Diverifikasi",
				fmt.Sprintf("Submission hasil pertandingan untuk %s telah disetujui", teamName),
				data); err != nil {
				slog.Error("failed to create approval notification", "submission_id", submissionID, "error", err)
			}
		} else {
			data, _ := json.Marshal(map[string]string{"submission_id": submissionID.String(), "reason": rejectionReason})
			if err := s.notificationSvc.Create(ctx, submission.SubmittedBy, "submission_rejected",
				"Hasil Ditolak",
				fmt.Sprintf("Submission hasil pertandingan untuk %s ditolak: %s", teamName, rejectionReason),
				data); err != nil {
				slog.Error("failed to create rejection notification", "submission_id", submissionID, "error", err)
			}
		}
	}

	// Broadcast verification event
	if submission.BracketMatchID != nil {
		s.broadcastSubmission(*submission.BracketMatchID, "submission_verified", map[string]interface{}{
			"submission_id": submissionID,
			"status":        status,
		})
	} else if submission.BRLobbyID != nil {
		s.broadcastSubmission(*submission.BRLobbyID, "br_submission_verified", map[string]interface{}{
			"submission_id": submissionID,
			"status":        status,
		})
	}

	return nil
}

// applyApprovedSubmission updates the actual match or lobby result based on the approved submission.
func (s *MatchSubmissionService) applyApprovedSubmission(ctx context.Context, sub *model.MatchSubmission) error {
	if sub.BracketMatchID != nil && sub.ClaimedWinnerID != nil {
		return s.applyApprovedBracketSubmission(ctx, sub)
	}

	if sub.BRLobbyID != nil && sub.ClaimedPlacement != nil {
		return s.applyApprovedBRSubmission(ctx, sub)
	}

	return nil
}

// AutoVerify checks if both teams in a bracket match submitted matching results and auto-approves.
func (s *MatchSubmissionService) AutoVerify(ctx context.Context, matchID uuid.UUID) (bool, error) {
	// Acquire an in-process lock so only one goroutine runs the verify logic for this matchID at a time.
	// LoadOrStore returns (existingValue, true) if the key was already present,
	// meaning another goroutine is already handling it.
	if _, loaded := autoVerifyLocks.LoadOrStore(matchID.String(), struct{}{}); loaded {
		return false, nil
	}
	defer autoVerifyLocks.Delete(matchID.String())

	match, err := s.bracketRepo.FindByID(ctx, matchID)
	if err != nil || match == nil {
		return false, fmt.Errorf("match not found")
	}

	if match.TeamAID == nil || match.TeamBID == nil {
		return false, nil
	}

	// Get pending submissions for this match
	subs, err := s.submissionRepo.FindPendingByMatch(ctx, matchID)
	if err != nil {
		return false, fmt.Errorf("find pending submissions: %w", err)
	}

	// Need at least 2 submissions (one from each team)
	if len(subs) < 2 {
		return false, nil
	}

	// Find submissions from each team
	var teamASub, teamBSub *model.MatchSubmission
	for _, sub := range subs {
		if sub.TeamID == *match.TeamAID && teamASub == nil {
			teamASub = sub
		}
		if sub.TeamID == *match.TeamBID && teamBSub == nil {
			teamBSub = sub
		}
	}

	if teamASub == nil || teamBSub == nil {
		return false, nil
	}

	// Check if both claim the same winner and same scores
	if teamASub.ClaimedWinnerID == nil || teamBSub.ClaimedWinnerID == nil {
		return false, nil
	}
	if *teamASub.ClaimedWinnerID != *teamBSub.ClaimedWinnerID {
		// Results conflict — mark both as disputed
		if err := s.submissionRepo.UpdateStatus(ctx, teamASub.ID, "disputed", nil, nil, strPtr("Auto-detected conflict: kedua tim mengklaim pemenang berbeda")); err != nil {
			slog.Error("failed to update submission status to disputed", "submission_id", teamASub.ID, "error", err)
		}
		if err := s.submissionRepo.UpdateStatus(ctx, teamBSub.ID, "disputed", nil, nil, strPtr("Auto-detected conflict: kedua tim mengklaim pemenang berbeda")); err != nil {
			slog.Error("failed to update submission status to disputed", "submission_id", teamBSub.ID, "error", err)
		}
		return false, nil
	}

	sameScore := true
	if teamASub.ClaimedScoreA != nil && teamBSub.ClaimedScoreA != nil {
		if *teamASub.ClaimedScoreA != *teamBSub.ClaimedScoreA {
			sameScore = false
		}
	}
	if teamASub.ClaimedScoreB != nil && teamBSub.ClaimedScoreB != nil {
		if *teamASub.ClaimedScoreB != *teamBSub.ClaimedScoreB {
			sameScore = false
		}
	}

	if !sameScore {
		// Scores differ — dispute
		if err := s.submissionRepo.UpdateStatus(ctx, teamASub.ID, "disputed", nil, nil, strPtr("Auto-detected conflict: skor berbeda")); err != nil {
			slog.Error("failed to update submission status to disputed", "submission_id", teamASub.ID, "error", err)
		}
		if err := s.submissionRepo.UpdateStatus(ctx, teamBSub.ID, "disputed", nil, nil, strPtr("Auto-detected conflict: skor berbeda")); err != nil {
			slog.Error("failed to update submission status to disputed", "submission_id", teamBSub.ID, "error", err)
		}
		return false, nil
	}

	// Both match! Auto-approve both
	if err := s.submissionRepo.UpdateStatus(ctx, teamASub.ID, "approved", nil, nil, strPtr("Auto-approved: kedua tim mengklaim hasil yang sama")); err != nil {
		slog.Error("failed to update submission status to approved", "submission_id", teamASub.ID, "error", err)
	}
	if err := s.submissionRepo.UpdateStatus(ctx, teamBSub.ID, "approved", nil, nil, strPtr("Auto-approved: kedua tim mengklaim hasil yang sama")); err != nil {
		slog.Error("failed to update submission status to approved", "submission_id", teamBSub.ID, "error", err)
	}

	// Apply the result
	if err := s.applyApprovedSubmission(ctx, teamASub); err != nil {
		slog.Error("failed to apply auto-approved result", "match_id", matchID, "error", err)
	}

	return true, nil
}

// broadcastSubmission sends a WebSocket broadcast for submission events.
func (s *MatchSubmissionService) broadcastSubmission(roomID uuid.UUID, msgType string, data interface{}) {
	if s.hub == nil {
		return
	}
	payload, err := ws.NewBroadcastData(msgType, data)
	if err != nil {
		slog.Error("failed to marshal submission broadcast", "error", err)
		return
	}
	s.hub.BroadcastToRoom(fmt.Sprintf("match:%s", roomID.String()), payload)
}
