package service

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
	"github.com/porjar-denpasar/porjar-api/internal/ws"
)

// SubmitGroupResult handles a player's submission for a group match.
func (s *MatchSubmissionService) SubmitGroupResult(
	ctx context.Context,
	groupMatchID uuid.UUID,
	teamID uuid.UUID,
	submittedBy uuid.UUID,
	claimedScoreA, claimedScoreB int,
	screenshots []string,
	gameNumber int,
) (*model.MatchSubmission, error) {
	if s.groupRepo == nil {
		return nil, apperror.BusinessRule("GROUP_NOT_SUPPORTED", "Fitur grup belum diaktifkan")
	}

	// 1. Load group match
	gm, err := s.groupRepo.FindMatchByID(ctx, groupMatchID)
	if err != nil || gm == nil {
		return nil, apperror.NotFound("MATCH")
	}

	// 2-4. Validate status, participation, and membership.
	// Use generic error to prevent enumeration.
	const groupSubmitDenied = "Anda tidak dapat submit hasil untuk match ini"
	if gm.Status != "live" {
		return nil, apperror.BusinessRule("SUBMIT_DENIED", groupSubmitDenied)
	}
	if gm.TeamAID == nil || gm.TeamBID == nil {
		return nil, apperror.BusinessRule("SUBMIT_DENIED", groupSubmitDenied)
	}
	if *gm.TeamAID != teamID && *gm.TeamBID != teamID {
		return nil, apperror.BusinessRule("SUBMIT_DENIED", groupSubmitDenied)
	}
	member, _ := s.teamMemberRepo.FindByTeamAndUser(ctx, teamID, submittedBy)
	if member == nil {
		return nil, apperror.BusinessRule("SUBMIT_DENIED", groupSubmitDenied)
	}

	// 5. Validate screenshots
	if len(screenshots) == 0 {
		return nil, apperror.ValidationError(map[string]string{
			"screenshot_urls": "Minimal satu screenshot bukti harus diupload",
		})
	}
	if len(screenshots) > 5 {
		return nil, apperror.ValidationError(map[string]string{
			"screenshot_urls": "Maksimal 5 screenshot",
		})
	}

	// 6. Score validation
	if claimedScoreA < 0 || claimedScoreB < 0 {
		return nil, apperror.ValidationError(map[string]string{"score": "Skor tidak boleh negatif"})
	}

	// 7. Determine claimed winner from scores
	var claimedWinnerID *uuid.UUID
	if claimedScoreA > claimedScoreB {
		claimedWinnerID = gm.TeamAID
	} else if claimedScoreB > claimedScoreA {
		claimedWinnerID = gm.TeamBID
	}
	// Draw is valid in group stage — no winner

	// 8. Acquire Redis lock to prevent duplicate submissions
	if s.rdb != nil {
		lockKey := fmt.Sprintf("group-submit:%s:%s", groupMatchID.String(), teamID.String())
		ok, err := s.rdb.SetNX(ctx, lockKey, "1", 10*time.Second).Result()
		if err != nil {
			slog.Error("SubmitGroupResult: failed to acquire Redis lock", "group_match_id", groupMatchID, "team_id", teamID, "error", err)
			return nil, apperror.BusinessRule("LOCK_ERROR", "Gagal mengakses sistem, coba lagi")
		}
		if !ok {
			return nil, apperror.Conflict("SUBMISSION_IN_PROGRESS", "Submission sedang diproses, coba lagi")
		}
		defer s.rdb.Del(ctx, lockKey)
	}

	// Check no existing pending submission from this team for this match
	pendingSubs, err := s.submissionRepo.FindPendingByGroupMatch(ctx, groupMatchID)
	if err != nil {
		return nil, apperror.Wrap(err, "check existing submissions")
	}
	for _, sub := range pendingSubs {
		if sub.TeamID == teamID {
			return nil, apperror.Conflict("DUPLICATE_SUBMISSION", "Tim Anda sudah memiliki submission pending untuk match ini")
		}
	}

	// 9. Create submission
	submission := &model.MatchSubmission{
		ID:              uuid.New(),
		GroupMatchID:    &groupMatchID,
		SubmittedBy:     submittedBy,
		TeamID:          teamID,
		ClaimedWinnerID: claimedWinnerID,
		ClaimedScoreA:   &claimedScoreA,
		ClaimedScoreB:   &claimedScoreB,
		ScreenshotURLs:  screenshots,
		Status:          "pending",
		GameNumber:      gameNumber,
	}

	if err := s.submissionRepo.Create(ctx, submission); err != nil {
		return nil, apperror.Wrap(err, "create group submission")
	}

	// Broadcast new_submission event to admin dashboard
	if s.hub != nil {
		gameSlug, _ := s.getGameSlugForTeam(ctx, teamID)
		payload, _ := ws.NewBroadcastData("new_submission", map[string]interface{}{
			"submission_id": submission.ID,
			"match_type":    "group",
			"game_name":     gameSlug,
		})
		s.hub.BroadcastToAll(payload)
	}

	// Send push notification
	if s.pushSender != nil {
		go s.pushSender.SendPushToAll(context.Background(), "Submission Baru", "Ada submission hasil pertandingan menunggu verifikasi", "/admin/submissions")
	}

	// Try auto-verify in goroutine
	go func() {
		bgCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		if autoApproved, err := s.AutoVerifyGroup(bgCtx, groupMatchID); err != nil {
			slog.Error("auto-verify group failed", "group_match_id", groupMatchID, "error", err)
		} else if autoApproved {
			slog.Info("auto-verify approved group match", "group_match_id", groupMatchID)
		}
	}()

	// Broadcast submission event to match room
	s.broadcastSubmission(groupMatchID, "group_submission_created", submission)

	// Notify admins
	if s.notificationSvc != nil {
		team, _ := s.teamRepo.FindByID(ctx, teamID)
		teamName := "Tim"
		gameName := ""
		if team != nil {
			teamName = team.Name
			if game, err := s.gameRepo.FindByID(ctx, team.GameID); err == nil && game != nil {
				gameName = game.Name
			}
		}
		go s.notificationSvc.NotifyAdminNewSubmission(
			context.Background(), teamName, gameName,
			fmt.Sprintf("Group Match #%d", gm.MatchNumber),
		)
	}

	return submission, nil
}

// AutoVerifyGroup checks if both teams submitted matching results for a group match.
func (s *MatchSubmissionService) AutoVerifyGroup(ctx context.Context, groupMatchID uuid.UUID) (bool, error) {
	// Acquire distributed lock via Redis SETNX
	lockKey := fmt.Sprintf("autoverify:lock:group:%s", groupMatchID.String())
	if s.rdb != nil {
		ok, err := s.rdb.SetNX(ctx, lockKey, "1", 30*time.Second).Result()
		if err != nil {
			slog.Error("AutoVerifyGroup: failed to acquire Redis lock", "group_match_id", groupMatchID, "error", err)
			return false, nil
		}
		if !ok {
			return false, nil
		}
		defer s.rdb.Del(ctx, lockKey)
	}

	if s.groupRepo == nil {
		return false, nil
	}

	// Load group match
	gm, err := s.groupRepo.FindMatchByID(ctx, groupMatchID)
	if err != nil || gm == nil {
		return false, apperror.Wrap(err, "find group match for auto-verify")
	}

	if gm.TeamAID == nil || gm.TeamBID == nil {
		return false, nil
	}

	// Get pending submissions for this group match
	subs, err := s.submissionRepo.FindPendingByGroupMatch(ctx, groupMatchID)
	if err != nil {
		return false, apperror.Wrap(err, "find pending group submissions")
	}

	// Need at least 2 submissions (one from each team)
	if len(subs) < 2 {
		return false, nil
	}

	// Group pending submissions by GameNumber
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
		if sub.TeamID == *gm.TeamAID && gameMap[gn].a == nil {
			gameMap[gn].a = sub
		}
		if sub.TeamID == *gm.TeamBID && gameMap[gn].b == nil {
			gameMap[gn].b = sub
		}
	}

	anyApproved := false
	for _, pair := range gameMap {
		teamASub := pair.a
		teamBSub := pair.b
		if teamASub == nil || teamBSub == nil {
			continue
		}

		// Compare claimed scores
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
			// Scores differ — mark both as disputed
			if err := s.submissionRepo.UpdateStatus(ctx, teamASub.ID, "disputed", nil, nil, strPtr("Auto-detected conflict: skor berbeda")); err != nil {
				slog.Error("failed to update group submission status to disputed", "submission_id", teamASub.ID, "error", err)
			}
			if err := s.submissionRepo.UpdateStatus(ctx, teamBSub.ID, "disputed", nil, nil, strPtr("Auto-detected conflict: skor berbeda")); err != nil {
				slog.Error("failed to update group submission status to disputed", "submission_id", teamBSub.ID, "error", err)
			}
			continue
		}

		// Check winner agreement (both claim same winner, or both claim draw)
		winnerMatch := true
		if teamASub.ClaimedWinnerID == nil && teamBSub.ClaimedWinnerID == nil {
			// Both claim draw — OK
		} else if teamASub.ClaimedWinnerID != nil && teamBSub.ClaimedWinnerID != nil {
			if *teamASub.ClaimedWinnerID != *teamBSub.ClaimedWinnerID {
				winnerMatch = false
			}
		} else {
			// One claims draw, other claims winner — conflict
			winnerMatch = false
		}

		if !winnerMatch {
			if err := s.submissionRepo.UpdateStatus(ctx, teamASub.ID, "disputed", nil, nil, strPtr("Auto-detected conflict: kedua tim mengklaim pemenang berbeda")); err != nil {
				slog.Error("failed to update group submission status to disputed", "submission_id", teamASub.ID, "error", err)
			}
			if err := s.submissionRepo.UpdateStatus(ctx, teamBSub.ID, "disputed", nil, nil, strPtr("Auto-detected conflict: kedua tim mengklaim pemenang berbeda")); err != nil {
				slog.Error("failed to update group submission status to disputed", "submission_id", teamBSub.ID, "error", err)
			}
			continue
		}

		// Validate no-draw for eFootball
		if teamASub.ClaimedScoreA != nil && teamASub.ClaimedScoreB != nil && *teamASub.ClaimedScoreA == *teamASub.ClaimedScoreB {
			gameSlug, _ := s.getGameSlugForTeam(ctx, teamASub.TeamID)
			if gameSlug == "efootball" {
				if err := s.submissionRepo.UpdateStatus(ctx, teamASub.ID, "disputed", nil, nil, strPtr("Auto-detected: skor seri tidak valid untuk eFootball")); err != nil {
					slog.Error("failed to update group submission status to disputed", "submission_id", teamASub.ID, "error", err)
				}
				if err := s.submissionRepo.UpdateStatus(ctx, teamBSub.ID, "disputed", nil, nil, strPtr("Auto-detected: skor seri tidak valid untuk eFootball")); err != nil {
					slog.Error("failed to update group submission status to disputed", "submission_id", teamBSub.ID, "error", err)
				}
				continue
			}
		}

		// Both match! Auto-approve both
		if err := s.submissionRepo.UpdateStatus(ctx, teamASub.ID, "approved", nil, nil, strPtr("Auto-approved: kedua tim mengklaim hasil yang sama")); err != nil {
			slog.Error("failed to update group submission status to approved", "submission_id", teamASub.ID, "error", err)
		}
		if err := s.submissionRepo.UpdateStatus(ctx, teamBSub.ID, "approved", nil, nil, strPtr("Auto-approved: kedua tim mengklaim hasil yang sama")); err != nil {
			slog.Error("failed to update group submission status to approved", "submission_id", teamBSub.ID, "error", err)
		}

		// Apply the result — if this fails, roll both back to pending
		if err := s.applyApprovedGroupSubmission(ctx, teamASub); err != nil {
			slog.Error("failed to apply auto-approved group result, rolling back", "group_match_id", groupMatchID, "error", err)
			_ = s.submissionRepo.UpdateStatus(ctx, teamASub.ID, "pending", nil, nil, strPtr("Auto-approve dibatalkan: gagal menerapkan hasil"))
			_ = s.submissionRepo.UpdateStatus(ctx, teamBSub.ID, "pending", nil, nil, strPtr("Auto-approve dibatalkan: gagal menerapkan hasil"))
			continue
		}

		anyApproved = true
	}

	return anyApproved, nil
}

// applyApprovedGroupSubmission applies the approved submission scores to the group match.
func (s *MatchSubmissionService) applyApprovedGroupSubmission(ctx context.Context, sub *model.MatchSubmission) error {
	if s.groupService == nil {
		slog.Warn("applyApprovedGroupSubmission: groupService not set, skipping")
		return nil
	}
	if sub.GroupMatchID == nil {
		return apperror.BusinessRule("NO_GROUP_MATCH_ID", "submission has no group_match_id")
	}
	if sub.ClaimedScoreA == nil || sub.ClaimedScoreB == nil {
		return apperror.BusinessRule("NO_CLAIMED_SCORES", "submission has no claimed scores")
	}

	_, err := s.groupService.SubmitMatchResult(ctx, *sub.GroupMatchID, *sub.ClaimedScoreA, *sub.ClaimedScoreB, nil)
	if err != nil {
		slog.Error("applyApprovedGroupSubmission: failed to apply result",
			"group_match_id", *sub.GroupMatchID,
			"score_a", *sub.ClaimedScoreA,
			"score_b", *sub.ClaimedScoreB,
			"error", err,
		)
		return err
	}

	slog.Info("applyApprovedGroupSubmission: result applied",
		"group_match_id", *sub.GroupMatchID,
		"score_a", *sub.ClaimedScoreA,
		"score_b", *sub.ClaimedScoreB,
	)
	return nil
}
