package service

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/queue"
)

// bracketSubmissionPayload mirrors the fields required by SubmitBracketResult.
type bracketSubmissionPayload struct {
	ClaimedWinnerID string   `json:"claimed_winner_id"`
	ScoreA          int      `json:"score_a"`
	ScoreB          int      `json:"score_b"`
	ScreenshotURLs  []string `json:"screenshot_urls"`
}

// brSubmissionPayload mirrors the fields required by SubmitBRResult.
type brSubmissionPayload struct {
	Placement      int      `json:"placement"`
	Kills          int      `json:"kills"`
	ScreenshotURLs []string `json:"screenshot_urls"`
}

// ProcessBracketSubmission implements queue.JobProcessor.
// It unmarshals the job payload and delegates to the existing SubmitBracketResult logic.
func (s *MatchSubmissionService) ProcessBracketSubmission(ctx context.Context, job queue.SubmissionJob) error {
	var p bracketSubmissionPayload
	if err := json.Unmarshal([]byte(job.Payload), &p); err != nil {
		return fmt.Errorf("process bracket submission: unmarshal payload: %w", err)
	}

	matchID, err := uuid.Parse(job.MatchID)
	if err != nil {
		return fmt.Errorf("process bracket submission: invalid match_id %q: %w", job.MatchID, err)
	}

	teamID, err := uuid.Parse(job.TeamID)
	if err != nil {
		return fmt.Errorf("process bracket submission: invalid team_id %q: %w", job.TeamID, err)
	}

	submittedBy, err := uuid.Parse(job.SubmittedByID)
	if err != nil {
		return fmt.Errorf("process bracket submission: invalid submitted_by_id %q: %w", job.SubmittedByID, err)
	}

	claimedWinnerID, err := uuid.Parse(p.ClaimedWinnerID)
	if err != nil {
		return fmt.Errorf("process bracket submission: invalid claimed_winner_id %q: %w", p.ClaimedWinnerID, err)
	}

	_, svcErr := s.SubmitBracketResult(
		ctx,
		matchID,
		teamID,
		submittedBy,
		claimedWinnerID,
		p.ScoreA,
		p.ScoreB,
		p.ScreenshotURLs,
	)
	if svcErr != nil {
		return fmt.Errorf("process bracket submission: %w", svcErr)
	}

	return nil
}

// ProcessBRSubmission implements queue.JobProcessor.
// It unmarshals the job payload and delegates to the existing SubmitBRResult logic.
func (s *MatchSubmissionService) ProcessBRSubmission(ctx context.Context, job queue.SubmissionJob) error {
	var p brSubmissionPayload
	if err := json.Unmarshal([]byte(job.Payload), &p); err != nil {
		return fmt.Errorf("process br submission: unmarshal payload: %w", err)
	}

	lobbyID, err := uuid.Parse(job.MatchID)
	if err != nil {
		return fmt.Errorf("process br submission: invalid match_id (lobby) %q: %w", job.MatchID, err)
	}

	teamID, err := uuid.Parse(job.TeamID)
	if err != nil {
		return fmt.Errorf("process br submission: invalid team_id %q: %w", job.TeamID, err)
	}

	submittedBy, err := uuid.Parse(job.SubmittedByID)
	if err != nil {
		return fmt.Errorf("process br submission: invalid submitted_by_id %q: %w", job.SubmittedByID, err)
	}

	_, svcErr := s.SubmitBRResult(
		ctx,
		lobbyID,
		teamID,
		submittedBy,
		p.Placement,
		p.Kills,
		p.ScreenshotURLs,
	)
	if svcErr != nil {
		return fmt.Errorf("process br submission: %w", svcErr)
	}

	return nil
}
