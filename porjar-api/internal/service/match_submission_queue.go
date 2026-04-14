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
	ScoreA         int      `json:"score_a"`
	ScoreB         int      `json:"score_b"`
	ScreenshotURLs []string `json:"screenshot_urls"`
}

// brSubmissionPayload mirrors the fields required by SubmitBRResult.
type brSubmissionPayload struct {
	MapNumber      int      `json:"map_number"`
	Placement      int      `json:"placement"`
	KillsP1        int      `json:"kills_p1"`
	KillsP2        int      `json:"kills_p2"`
	KillsP3        int      `json:"kills_p3"`
	KillsP4        int      `json:"kills_p4"`
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

	_, svcErr := s.SubmitBracketResult(
		ctx,
		matchID,
		teamID,
		submittedBy,
		p.ScoreA,
		p.ScoreB,
		p.ScreenshotURLs,
	)
	if svcErr != nil {
		return fmt.Errorf("process bracket submission: %w", svcErr)
	}

	return nil
}

// groupSubmissionPayload mirrors the fields required by SubmitGroupResult.
type groupSubmissionPayload struct {
	ScoreA         int      `json:"score_a"`
	ScoreB         int      `json:"score_b"`
	ScreenshotURLs []string `json:"screenshot_urls"`
	GameNumber     int      `json:"game_number"`
}

// ProcessGroupSubmission implements queue.JobProcessor.
// It unmarshals the job payload and delegates to the existing SubmitGroupResult logic.
func (s *MatchSubmissionService) ProcessGroupSubmission(ctx context.Context, job queue.SubmissionJob) error {
	var p groupSubmissionPayload
	if err := json.Unmarshal([]byte(job.Payload), &p); err != nil {
		return fmt.Errorf("process group submission: unmarshal payload: %w", err)
	}

	matchID, err := uuid.Parse(job.MatchID)
	if err != nil {
		return fmt.Errorf("process group submission: invalid match_id %q: %w", job.MatchID, err)
	}

	teamID, err := uuid.Parse(job.TeamID)
	if err != nil {
		return fmt.Errorf("process group submission: invalid team_id %q: %w", job.TeamID, err)
	}

	submittedBy, err := uuid.Parse(job.SubmittedByID)
	if err != nil {
		return fmt.Errorf("process group submission: invalid submitted_by_id %q: %w", job.SubmittedByID, err)
	}

	gameNumber := p.GameNumber
	if gameNumber <= 0 {
		gameNumber = 1
	}

	_, svcErr := s.SubmitGroupResult(
		ctx,
		matchID,
		teamID,
		submittedBy,
		p.ScoreA,
		p.ScoreB,
		p.ScreenshotURLs,
		gameNumber,
	)
	if svcErr != nil {
		return fmt.Errorf("process group submission: %w", svcErr)
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

	mapNumber := p.MapNumber
	if mapNumber <= 0 {
		mapNumber = 1
	}

	_, svcErr := s.SubmitBRResult(
		ctx,
		lobbyID,
		teamID,
		submittedBy,
		mapNumber,
		p.Placement,
		p.KillsP1, p.KillsP2, p.KillsP3, p.KillsP4,
		p.ScreenshotURLs,
	)
	if svcErr != nil {
		return fmt.Errorf("process br submission: %w", svcErr)
	}

	return nil
}
