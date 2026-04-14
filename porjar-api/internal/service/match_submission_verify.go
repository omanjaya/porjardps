package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
	"github.com/porjar-denpasar/porjar-api/internal/ws"
)

// VerifySubmission allows an admin to approve or reject a submission.
func (s *MatchSubmissionService) VerifySubmission(
	ctx context.Context,
	submissionID uuid.UUID,
	adminID uuid.UUID,
	approved bool,
	rejectionReason string,
	adminNotes string,
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

	var adminNotesPtr *string
	if adminNotes != "" {
		adminNotesPtr = &adminNotes
	}

	if err := s.submissionRepo.UpdateStatus(ctx, submissionID, status, &adminID, rejReason, adminNotesPtr); err != nil {
		return apperror.Wrap(err, "update submission status")
	}

	// If approved, auto-update the actual match/lobby results.
	// If apply fails, roll back to pending so the admin can retry.
	if approved {
		if applyErr := s.applyApprovedSubmission(ctx, submission); applyErr != nil {
			slog.Error("failed to apply approved submission, rolling back to pending", "submission_id", submissionID, "error", applyErr)
			if rollbackErr := s.submissionRepo.UpdateStatus(ctx, submissionID, "pending", nil, nil, strPtr("Gagal menerapkan hasil otomatis, silakan coba approve ulang")); rollbackErr != nil {
				slog.Error("failed to rollback submission status", "submission_id", submissionID, "error", rollbackErr)
			}
			return fmt.Errorf("apply approved submission: %w", applyErr)
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

	// Broadcast verification event to specific match/lobby room
	verifyData := map[string]interface{}{
		"submission_id": submissionID,
		"status":        status,
	}
	if submission.BracketMatchID != nil {
		s.broadcastSubmission(*submission.BracketMatchID, "submission_verified", verifyData)
	} else if submission.BRLobbyID != nil {
		s.broadcastSubmission(*submission.BRLobbyID, "br_submission_verified", verifyData)
	} else if submission.GroupMatchID != nil {
		s.broadcastSubmission(*submission.GroupMatchID, "group_submission_verified", verifyData)
	}

	// Also broadcast to all clients so admin submission lists update in real-time
	if s.hub != nil {
		payload, _ := ws.NewBroadcastData("new_submission", verifyData)
		s.hub.BroadcastToAll(payload)
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

	if sub.GroupMatchID != nil {
		return s.applyApprovedGroupSubmission(ctx, sub)
	}

	slog.Warn("applyApprovedSubmission: submission has no bracket, BR, or group data",
		"submission_id", sub.ID)
	return nil
}

// AutoVerify checks if both teams in a bracket match submitted matching results and auto-approves.
func (s *MatchSubmissionService) AutoVerify(ctx context.Context, matchID uuid.UUID) (bool, error) {
	// Acquire a distributed lock via Redis SETNX so only one instance/goroutine
	// runs the verify logic for this matchID at a time.
	lockKey := fmt.Sprintf("autoverify:lock:%s", matchID.String())
	if s.rdb != nil {
		ok, err := s.rdb.SetNX(ctx, lockKey, "1", 30*time.Second).Result()
		if err != nil {
			slog.Error("AutoVerify: failed to acquire Redis lock", "match_id", matchID, "error", err)
			return false, nil
		}
		if !ok {
			return false, nil
		}
		defer s.rdb.Del(ctx, lockKey)
	}

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

	// Group pending submissions by game_number
	type subPair struct{ a, b *model.MatchSubmission }
	gameMap := make(map[int]*subPair)
	for _, sub := range subs {
		gn := sub.GameNumber
		if gn == 0 {
			gn = 1
		}
		if _, ok := gameMap[gn]; !ok {
			gameMap[gn] = &subPair{}
		}
		if sub.TeamID == *match.TeamAID && gameMap[gn].a == nil {
			gameMap[gn].a = sub
		}
		if sub.TeamID == *match.TeamBID && gameMap[gn].b == nil {
			gameMap[gn].b = sub
		}
	}

	anyApproved := false
	for _, pair := range gameMap {
		teamASub := pair.a
		teamBSub := pair.b

		// Need both teams' submissions for this game
		if teamASub == nil || teamBSub == nil {
			continue
		}

		// Check if both claim the same winner and same scores
		if teamASub.ClaimedWinnerID == nil || teamBSub.ClaimedWinnerID == nil {
			continue
		}
		if *teamASub.ClaimedWinnerID != *teamBSub.ClaimedWinnerID {
			// Results conflict — mark both as disputed
			if err := s.submissionRepo.UpdateStatus(ctx, teamASub.ID, "disputed", nil, nil, strPtr("Auto-detected conflict: kedua tim mengklaim pemenang berbeda")); err != nil {
				slog.Error("failed to update submission status to disputed", "submission_id", teamASub.ID, "error", err)
			}
			if err := s.submissionRepo.UpdateStatus(ctx, teamBSub.ID, "disputed", nil, nil, strPtr("Auto-detected conflict: kedua tim mengklaim pemenang berbeda")); err != nil {
				slog.Error("failed to update submission status to disputed", "submission_id", teamBSub.ID, "error", err)
			}
			continue
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
			continue
		}

		// Validate scores are legal for the game type before auto-approving
		if teamASub.ClaimedWinnerID != nil && teamASub.ClaimedScoreA != nil && teamASub.ClaimedScoreB != nil {
			gameSlug, _ := s.getGameSlugForTeam(ctx, teamASub.TeamID)
			if gameSlug == "efootball" {
				scoreA := *teamASub.ClaimedScoreA
				scoreB := *teamASub.ClaimedScoreB
				if scoreA == scoreB {
					// Draw - invalid for eFootball, mark as disputed
					if err := s.submissionRepo.UpdateStatus(ctx, teamASub.ID, "disputed", nil, nil, strPtr("Auto-detected: skor seri tidak valid untuk eFootball")); err != nil {
						slog.Error("failed to update submission status to disputed", "submission_id", teamASub.ID, "error", err)
					}
					if err := s.submissionRepo.UpdateStatus(ctx, teamBSub.ID, "disputed", nil, nil, strPtr("Auto-detected: skor seri tidak valid untuk eFootball")); err != nil {
						slog.Error("failed to update submission status to disputed", "submission_id", teamBSub.ID, "error", err)
					}
					continue
				}
				winnerIsA := *teamASub.ClaimedWinnerID == *match.TeamAID
				if (winnerIsA && scoreA <= scoreB) || (!winnerIsA && scoreB <= scoreA) {
					if err := s.submissionRepo.UpdateStatus(ctx, teamASub.ID, "disputed", nil, nil, strPtr("Auto-detected: skor pemenang harus lebih tinggi")); err != nil {
						slog.Error("failed to update submission status to disputed", "submission_id", teamASub.ID, "error", err)
					}
					if err := s.submissionRepo.UpdateStatus(ctx, teamBSub.ID, "disputed", nil, nil, strPtr("Auto-detected: skor pemenang harus lebih tinggi")); err != nil {
						slog.Error("failed to update submission status to disputed", "submission_id", teamBSub.ID, "error", err)
					}
					continue
				}
			}
		}

		// Both match! Auto-approve both
		if err := s.submissionRepo.UpdateStatus(ctx, teamASub.ID, "approved", nil, nil, strPtr("Auto-approved: kedua tim mengklaim hasil yang sama")); err != nil {
			slog.Error("failed to update submission status to approved", "submission_id", teamASub.ID, "error", err)
		}
		if err := s.submissionRepo.UpdateStatus(ctx, teamBSub.ID, "approved", nil, nil, strPtr("Auto-approved: kedua tim mengklaim hasil yang sama")); err != nil {
			slog.Error("failed to update submission status to approved", "submission_id", teamBSub.ID, "error", err)
		}

		// Apply the result — if this fails, roll both back to pending
		if err := s.applyApprovedSubmission(ctx, teamASub); err != nil {
			slog.Error("failed to apply auto-approved result, rolling back", "match_id", matchID, "error", err)
			_ = s.submissionRepo.UpdateStatus(ctx, teamASub.ID, "pending", nil, nil, strPtr("Auto-approve dibatalkan: gagal menerapkan hasil"))
			_ = s.submissionRepo.UpdateStatus(ctx, teamBSub.ID, "pending", nil, nil, strPtr("Auto-approve dibatalkan: gagal menerapkan hasil"))
			return false, fmt.Errorf("apply auto-approved result: %w", err)
		}

		anyApproved = true
	}

	return anyApproved, nil
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

// broadcastSubmissionToTournament broadcasts submission events to tournament room.
func (s *MatchSubmissionService) broadcastSubmissionToTournament(tournamentID uuid.UUID, msgType string, data interface{}) {
	if s.hub == nil {
		return
	}
	payload, err := ws.NewBroadcastData(msgType, data)
	if err != nil {
		return
	}
	s.hub.BroadcastToRoom(fmt.Sprintf("tournament:%s", tournamentID.String()), payload)
}
