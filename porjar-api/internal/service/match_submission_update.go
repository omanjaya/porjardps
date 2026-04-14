package service

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
)

// UpdateSubmissionInput contains fields that a player can update on a pending submission.
type UpdateSubmissionInput struct {
	ClaimedWinner    string
	ClaimedScoreA    *int
	ClaimedScoreB    *int
	ClaimedPlacement *int
	// For BR submissions, set KillsP1-P4 instead of ClaimedKills.
	// ClaimedKills is auto-summed from per-player values when any of them is non-nil.
	KillsP1 *int
	KillsP2 *int
	KillsP3 *int
	KillsP4 *int
	Screenshots []string
}

// UpdateSubmission allows the original submitter to update a pending submission.
func (s *MatchSubmissionService) UpdateSubmission(ctx context.Context, submissionID, userID uuid.UUID, input UpdateSubmissionInput) error {
	sub, err := s.submissionRepo.FindByID(ctx, submissionID)
	if err != nil || sub == nil {
		return apperror.NotFound("SUBMISSION")
	}
	if sub.SubmittedBy != userID {
		return apperror.BusinessRule("FORBIDDEN", "Hanya pengirim yang boleh mengubah submission")
	}
	if sub.Status != "pending" {
		return apperror.BusinessRule("ALREADY_VERIFIED", "Submission sudah diverifikasi, tidak bisa diubah")
	}

	// Verify match is still active
	if sub.BracketMatchID != nil {
		if match, err := s.bracketRepo.FindByID(ctx, *sub.BracketMatchID); err == nil && match != nil {
			if match.Status == "completed" {
				return apperror.BusinessRule("MATCH_COMPLETED", "Match sudah selesai, submission tidak bisa diubah")
			}
		}
	}
	if sub.BRLobbyID != nil {
		if lobby, err := s.brLobbyRepo.FindByID(ctx, *sub.BRLobbyID); err == nil && lobby != nil {
			if lobby.Status == "completed" {
				return apperror.BusinessRule("MATCH_COMPLETED", "Lobby sudah selesai, submission tidak bisa diubah")
			}
		}
	}
	if sub.GroupMatchID != nil && s.groupRepo != nil {
		if gm, err := s.groupRepo.FindMatchByID(ctx, *sub.GroupMatchID); err == nil && gm != nil {
			if gm.Status == "completed" {
				return apperror.BusinessRule("MATCH_COMPLETED", "Match sudah selesai, submission tidak bisa diubah")
			}
		}
	}

	// Update fields if provided
	if input.ClaimedScoreA != nil {
		sub.ClaimedScoreA = input.ClaimedScoreA
	}
	if input.ClaimedScoreB != nil {
		sub.ClaimedScoreB = input.ClaimedScoreB
	}
	if input.ClaimedPlacement != nil {
		sub.ClaimedPlacement = input.ClaimedPlacement
	}
	// Per-player kills: if any provided, recalculate all four and auto-sum total.
	if input.KillsP1 != nil || input.KillsP2 != nil || input.KillsP3 != nil || input.KillsP4 != nil {
		if input.KillsP1 != nil {
			sub.KillsP1 = *input.KillsP1
		}
		if input.KillsP2 != nil {
			sub.KillsP2 = *input.KillsP2
		}
		if input.KillsP3 != nil {
			sub.KillsP3 = *input.KillsP3
		}
		if input.KillsP4 != nil {
			sub.KillsP4 = *input.KillsP4
		}
		total := sub.KillsP1 + sub.KillsP2 + sub.KillsP3 + sub.KillsP4
		sub.ClaimedKills = &total
	}

	// Validate score ranges for bracket submissions (must match SubmitBracketResult limits)
	if sub.BracketMatchID != nil {
		if sub.ClaimedScoreA != nil && (*sub.ClaimedScoreA < 0 || *sub.ClaimedScoreA > 20) {
			return apperror.ValidationError(map[string]string{"score": "Skor tidak valid (0-20)"})
		}
		if sub.ClaimedScoreB != nil && (*sub.ClaimedScoreB < 0 || *sub.ClaimedScoreB > 20) {
			return apperror.ValidationError(map[string]string{"score": "Skor tidak valid (0-20)"})
		}
		if sub.ClaimedScoreA != nil && sub.ClaimedScoreB != nil && *sub.ClaimedScoreA == *sub.ClaimedScoreB {
			return apperror.ValidationError(map[string]string{"score": "Skor seri tidak berlaku di pertandingan bracket"})
		}
	}

	// Validate placement/kills for BR submissions
	if sub.BRLobbyID != nil {
		if sub.ClaimedPlacement != nil {
			gameSlug, _ := s.getGameSlugForTeam(ctx, sub.TeamID)
			maxPlacement := 100
			switch gameSlug {
			case "pubgm":
				maxPlacement = 25
			case "ff":
				maxPlacement = 18
			}
			if *sub.ClaimedPlacement < 1 || *sub.ClaimedPlacement > maxPlacement {
				return apperror.ValidationError(map[string]string{
					"placement": fmt.Sprintf("Placement harus 1-%d", maxPlacement),
				})
			}
		}
		if sub.ClaimedKills != nil && (*sub.ClaimedKills < 0 || *sub.ClaimedKills > 999) {
			return apperror.ValidationError(map[string]string{"kills": "Kills tidak valid (0-999)"})
		}
	}

	if len(input.Screenshots) > 0 {
		// Validate per-game screenshot limit
		if sub.BracketMatchID != nil {
			gameSlug, _ := s.getGameSlugForTeam(ctx, sub.TeamID)
			bestOf := 1
			if match, err := s.bracketRepo.FindByID(ctx, *sub.BracketMatchID); err == nil && match != nil {
				bestOf = match.BestOf
			}
			maxSS := gameMaxScreenshots(gameSlug, "bracket", bestOf)
			if len(input.Screenshots) > maxSS {
				return apperror.ValidationError(map[string]string{
					"screenshots": fmt.Sprintf("Maksimal %d screenshot untuk game ini", maxSS),
				})
			}
		} else if sub.BRLobbyID != nil {
			if len(input.Screenshots) > 2 {
				return apperror.ValidationError(map[string]string{
					"screenshots": "Maksimal 2 screenshot untuk Battle Royale",
				})
			}
		}
		sub.ScreenshotURLs = input.Screenshots
	}

	// Auto-derive winner from updated scores if both scores are set
	if sub.BracketMatchID != nil && sub.ClaimedScoreA != nil && sub.ClaimedScoreB != nil {
		if *sub.ClaimedScoreA != *sub.ClaimedScoreB {
			match, mErr := s.bracketRepo.FindByID(ctx, *sub.BracketMatchID)
			if mErr == nil && match != nil {
				if *sub.ClaimedScoreA > *sub.ClaimedScoreB && match.TeamAID != nil {
					sub.ClaimedWinnerID = match.TeamAID
				} else if *sub.ClaimedScoreB > *sub.ClaimedScoreA && match.TeamBID != nil {
					sub.ClaimedWinnerID = match.TeamBID
				}
			}
		}
	}

	// Use a simple update query
	if err := s.submissionRepo.Update(ctx, sub); err != nil {
		return apperror.ErrInternal
	}
	return nil
}

// DeleteScreenshot removes a single screenshot URL from a pending submission.
func (s *MatchSubmissionService) DeleteScreenshot(ctx context.Context, submissionID, userID uuid.UUID, url string) error {
	sub, err := s.submissionRepo.FindByID(ctx, submissionID)
	if err != nil || sub == nil {
		return apperror.NotFound("SUBMISSION")
	}
	if sub.SubmittedBy != userID {
		return apperror.BusinessRule("FORBIDDEN", "Hanya pengirim yang boleh mengubah submission")
	}
	if sub.Status != "pending" {
		return apperror.BusinessRule("ALREADY_VERIFIED", "Submission sudah diverifikasi, tidak bisa diubah")
	}
	if len(sub.ScreenshotURLs) <= 1 {
		return apperror.BusinessRule("LAST_SCREENSHOT", "Minimal satu screenshot harus ada, tidak bisa dihapus semua")
	}
	if err := s.submissionRepo.DeleteScreenshot(ctx, submissionID, url); err != nil {
		return apperror.ErrInternal
	}
	return nil
}

// UpdateScreenshots allows the original submitter to replace screenshots on a pending submission.
func (s *MatchSubmissionService) UpdateScreenshots(ctx context.Context, submissionID, userID uuid.UUID, urls []string) error {
	sub, err := s.submissionRepo.FindByID(ctx, submissionID)
	if err != nil || sub == nil {
		return apperror.NotFound("SUBMISSION")
	}
	if sub.SubmittedBy != userID {
		return apperror.BusinessRule("FORBIDDEN", "Hanya pengirim yang boleh mengubah submission")
	}
	if sub.Status != "pending" {
		return apperror.BusinessRule("ALREADY_VERIFIED", "Submission sudah diverifikasi, tidak bisa diubah")
	}
	if err := s.submissionRepo.UpdateScreenshots(ctx, submissionID, urls); err != nil {
		return apperror.ErrInternal
	}
	return nil
}
