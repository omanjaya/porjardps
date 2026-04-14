package service

import (
	"context"
	"log/slog"

	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
)

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

// ResetBracketMatchSubmissions deletes all submissions for a bracket match and resets match score.
func (s *MatchSubmissionService) ResetBracketMatchSubmissions(ctx context.Context, matchID uuid.UUID) error {
	match, err := s.bracketRepo.FindByID(ctx, matchID)
	if err != nil || match == nil {
		return apperror.NotFound("MATCH")
	}

	if err := s.submissionRepo.DeleteByBracketMatch(ctx, matchID); err != nil {
		return apperror.Wrap(err, "delete bracket submissions")
	}

	// Save old winner/loser before clearing so we can undo advancement
	oldWinnerID := match.WinnerID
	oldLoserID := match.LoserID

	// Reset match scores but keep teams and status
	zero := 0
	match.ScoreA = &zero
	match.ScoreB = &zero
	match.WinnerID = nil
	match.LoserID = nil
	if match.Status == "completed" {
		match.Status = "live"
	}
	if err := s.bracketRepo.Update(ctx, match); err != nil {
		slog.Error("failed to reset bracket match scores", "match_id", matchID, "error", err)
	}

	// Undo winner advancement to the next match
	if match.NextMatchID != nil && oldWinnerID != nil {
		nextMatch, err := s.bracketRepo.FindByID(ctx, *match.NextMatchID)
		if err == nil && nextMatch != nil {
			updated := false
			if nextMatch.TeamAID != nil && *nextMatch.TeamAID == *oldWinnerID {
				nextMatch.TeamAID = nil
				updated = true
			} else if nextMatch.TeamBID != nil && *nextMatch.TeamBID == *oldWinnerID {
				nextMatch.TeamBID = nil
				updated = true
			}
			if updated {
				if err := s.bracketRepo.Update(ctx, nextMatch); err != nil {
					slog.Error("failed to undo winner advancement", "match_id", matchID, "next_match_id", *match.NextMatchID, "error", err)
				}
			}
		}
	}

	// Undo loser advancement to the loser bracket next match (double elimination)
	if match.LoserNextMatchID != nil && oldLoserID != nil {
		loserNextMatch, err := s.bracketRepo.FindByID(ctx, *match.LoserNextMatchID)
		if err == nil && loserNextMatch != nil {
			updated := false
			if loserNextMatch.TeamAID != nil && *loserNextMatch.TeamAID == *oldLoserID {
				loserNextMatch.TeamAID = nil
				updated = true
			} else if loserNextMatch.TeamBID != nil && *loserNextMatch.TeamBID == *oldLoserID {
				loserNextMatch.TeamBID = nil
				updated = true
			}
			if updated {
				if err := s.bracketRepo.Update(ctx, loserNextMatch); err != nil {
					slog.Error("failed to undo loser advancement", "match_id", matchID, "loser_next_match_id", *match.LoserNextMatchID, "error", err)
				}
			}
		}
	}

	return nil
}

// ResetGroupMatchSubmissions deletes all submissions for a group match and resets match score.
func (s *MatchSubmissionService) ResetGroupMatchSubmissions(ctx context.Context, matchID uuid.UUID) error {
	if s.groupRepo == nil {
		return apperror.BusinessRule("GROUP_NOT_SUPPORTED", "Fitur grup belum diaktifkan")
	}

	gm, err := s.groupRepo.FindMatchByID(ctx, matchID)
	if err != nil || gm == nil {
		return apperror.NotFound("MATCH")
	}

	if err := s.submissionRepo.DeleteByGroupMatch(ctx, matchID); err != nil {
		return apperror.Wrap(err, "delete group submissions")
	}

	// Reset match score and status
	if err := s.groupRepo.UpdateMatchScore(ctx, matchID, 0, 0, nil); err != nil {
		slog.Error("failed to reset group match score", "match_id", matchID, "error", err)
	}
	// Set back to scheduled (UpdateMatchScore sets to completed)
	if err := s.groupRepo.UpdateMatchStatus(ctx, matchID, "scheduled"); err != nil {
		slog.Error("failed to reset group match status", "match_id", matchID, "error", err)
	}

	// Recalculate group standings
	if s.groupService != nil {
		s.groupService.RecalculateStandings(ctx, gm.GroupID)
	}

	return nil
}
