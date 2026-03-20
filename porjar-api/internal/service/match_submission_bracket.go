package service

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
)

// SubmitBracketResult allows a participant to submit match result with screenshot evidence.
func (s *MatchSubmissionService) SubmitBracketResult(
	ctx context.Context,
	matchID uuid.UUID,
	teamID uuid.UUID,
	submittedBy uuid.UUID,
	claimedWinnerID uuid.UUID,
	scoreA, scoreB int,
	screenshotURLs []string,
) (*model.MatchSubmission, error) {
	// Validate match exists
	match, err := s.bracketRepo.FindByID(ctx, matchID)
	if err != nil || match == nil {
		return nil, apperror.NotFound("MATCH")
	}

	// Validate match is live or scheduled
	if match.Status != "live" && match.Status != "scheduled" {
		return nil, apperror.BusinessRule("MATCH_NOT_ACTIVE", "Match harus berstatus live atau scheduled untuk submit hasil")
	}

	// Validate team is a participant
	if (match.TeamAID == nil || *match.TeamAID != teamID) && (match.TeamBID == nil || *match.TeamBID != teamID) {
		return nil, apperror.BusinessRule("NOT_PARTICIPANT", "Tim Anda bukan peserta di match ini")
	}

	// Validate submitting user is a member of the team
	member, _ := s.teamMemberRepo.FindByTeamAndUser(ctx, teamID, submittedBy)
	if member == nil {
		return nil, apperror.BusinessRule("NOT_TEAM_MEMBER", "Anda bukan anggota tim ini")
	}

	// Validate claimed winner is one of the participants
	if (match.TeamAID == nil || *match.TeamAID != claimedWinnerID) && (match.TeamBID == nil || *match.TeamBID != claimedWinnerID) {
		return nil, apperror.BusinessRule("INVALID_WINNER", "Winner harus salah satu dari tim peserta match")
	}

	// Validate screenshots provided
	if len(screenshotURLs) == 0 {
		return nil, apperror.ValidationError(map[string]string{
			"screenshot_urls": "Minimal satu screenshot bukti harus diupload",
		})
	}

	// Validate score matches BO config
	bestOf := match.BestOf
	if bestOf <= 0 {
		bestOf = 1 // default BO1
	}
	winsNeeded := (bestOf / 2) + 1 // BO1=1, BO3=2, BO5=3
	winnerScore := scoreA
	loserScore := scoreB
	if claimedWinnerID == *match.TeamBID {
		winnerScore = scoreB
		loserScore = scoreA
	}
	if winnerScore != winsNeeded {
		return nil, apperror.ValidationError(map[string]string{
			"score": fmt.Sprintf("Untuk BO%d, skor pemenang harus %d", bestOf, winsNeeded),
		})
	}
	if loserScore < 0 || loserScore >= winsNeeded {
		return nil, apperror.ValidationError(map[string]string{
			"score": fmt.Sprintf("Untuk BO%d, skor yang kalah harus 0-%d", bestOf, winsNeeded-1),
		})
	}
	if scoreA+scoreB > bestOf {
		return nil, apperror.ValidationError(map[string]string{
			"score": fmt.Sprintf("Total game tidak boleh lebih dari %d", bestOf),
		})
	}

	// Check no duplicate pending submission from same team
	existing, err := s.submissionRepo.FindByMatch(ctx, matchID)
	if err != nil {
		return nil, apperror.Wrap(err, "check existing submissions")
	}
	for _, sub := range existing {
		if sub.TeamID == teamID && sub.Status == "pending" {
			return nil, apperror.Conflict("DUPLICATE_SUBMISSION", "Tim Anda sudah memiliki submission pending untuk match ini")
		}
	}

	submission := &model.MatchSubmission{
		ID:              uuid.New(),
		BracketMatchID:  &matchID,
		SubmittedBy:     submittedBy,
		TeamID:          teamID,
		ClaimedWinnerID: &claimedWinnerID,
		ClaimedScoreA:   &scoreA,
		ClaimedScoreB:   &scoreB,
		ScreenshotURLs:  screenshotURLs,
		Status:          "pending",
	}

	if err := s.submissionRepo.Create(ctx, submission); err != nil {
		return nil, apperror.Wrap(err, "create submission")
	}

	// Try auto-verify if both teams submitted matching results
	slog.Debug("starting auto-verify goroutine", "match_id", matchID)
	go func() {
		bgCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		if autoApproved, err := s.AutoVerify(bgCtx, matchID); err != nil {
			slog.Error("auto-verify failed", "match_id", matchID, "error", err)
		} else if autoApproved {
			slog.Info("auto-verify approved match", "match_id", matchID)
		}
	}()

	// Broadcast submission event
	s.broadcastSubmission(matchID, "submission_created", submission)

	return submission, nil
}

// applyApprovedBracketSubmission updates the bracket match result based on the approved submission.
func (s *MatchSubmissionService) applyApprovedBracketSubmission(ctx context.Context, sub *model.MatchSubmission) error {
	match, err := s.bracketRepo.FindByID(ctx, *sub.BracketMatchID)
	if err != nil || match == nil {
		return fmt.Errorf("match not found")
	}

	// Only apply if match is not already completed
	if match.Status == "completed" {
		return nil
	}

	scoreA := 0
	scoreB := 0
	if sub.ClaimedScoreA != nil {
		scoreA = *sub.ClaimedScoreA
	}
	if sub.ClaimedScoreB != nil {
		scoreB = *sub.ClaimedScoreB
	}

	// Determine loser
	var loserID uuid.UUID
	if match.TeamAID != nil && *match.TeamAID == *sub.ClaimedWinnerID {
		if match.TeamBID != nil {
			loserID = *match.TeamBID
		}
	} else if match.TeamBID != nil {
		if match.TeamAID != nil {
			loserID = *match.TeamAID
		}
	}

	// Update scores on the match first
	match.ScoreA = &scoreA
	match.ScoreB = &scoreB
	match.WinnerID = sub.ClaimedWinnerID
	if loserID != uuid.Nil {
		match.LoserID = &loserID
	}

	// Set match to live if still pending
	if match.Status == "pending" || match.Status == "scheduled" {
		match.Status = "live"
	}

	if err := s.bracketRepo.Update(ctx, match); err != nil {
		slog.Error("failed to update match scores", "error", err)
	}

	// Complete the match via bracketService (handles advancement)
	if err := s.bracketService.CompleteMatch(ctx, *sub.BracketMatchID, *sub.ClaimedWinnerID); err != nil {
		slog.Error("CompleteMatch failed, completing directly", "error", err)
		// Fallback: mark completed directly
		now := time.Now()
		match.Status = "completed"
		match.CompletedAt = &now
		if updateErr := s.bracketRepo.Update(ctx, match); updateErr != nil {
			return fmt.Errorf("apply bracket result: %w", updateErr)
		}
	}

	return nil
}
