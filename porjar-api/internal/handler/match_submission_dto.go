package handler

import (
	"fmt"
	"strings"
	"time"

	"github.com/porjar-denpasar/porjar-api/internal/model"
)

// adminSubmissionView is the normalized response for admin submission endpoints.
// Field names match the frontend SubmissionData interface.
type adminSubmissionView struct {
	ID                 string                `json:"id"`
	MatchID            string                `json:"match_id"`
	MatchType          string                `json:"match_type"`
	TeamAName          string                `json:"team_a_name"`
	TeamBName          string                `json:"team_b_name"`
	SubmittedTeam      string                `json:"submitted_team"`
	GameName           string                `json:"game_name"`
	GameSlug           string                `json:"game_slug,omitempty"`
	ClaimedScoreA      *int                  `json:"claimed_score_a"`
	ClaimedScoreB      *int                  `json:"claimed_score_b"`
	ClaimedWinner      string                `json:"claimed_winner,omitempty"`
	ClaimedPlacement   *int                  `json:"claimed_placement"`
	ClaimedKills       *int                  `json:"claimed_kills"`
	KillsP1            int                   `json:"kills_p1"`
	KillsP2            int                   `json:"kills_p2"`
	KillsP3            int                   `json:"kills_p3"`
	KillsP4            int                   `json:"kills_p4"`
	Screenshots        []string              `json:"screenshots"`
	Status             string                `json:"status"`
	SubmittedBy        string                `json:"submitted_by"`
	SubmittedAt        string                `json:"submitted_at"`
	RejectionReason    string                `json:"rejection_reason,omitempty"`
	AdminNotes         string                `json:"admin_notes,omitempty"`
	IsAutoMatched      bool                  `json:"is_auto_matched,omitempty"`
	OpponentSubmission *adminSubmissionView  `json:"opponent_submission,omitempty"`
	History            []adminSubmissionView `json:"history,omitempty"`
}

func dtoToAdminView(dto *model.AdminSubmissionDTO) adminSubmissionView {
	matchID := ""
	matchType := "battle_royale"
	if dto.GroupMatchID != nil {
		matchID = dto.GroupMatchID.String()
		matchType = "group"
	} else if dto.BracketMatchID != nil {
		matchID = dto.BracketMatchID.String()
		matchType = "bracket"
	} else if dto.BRLobbyID != nil {
		matchID = dto.BRLobbyID.String()
	}

	rejReason := ""
	if dto.RejectionReason != nil {
		rejReason = *dto.RejectionReason
	}
	adminNotes := ""
	if dto.AdminNotes != nil {
		adminNotes = *dto.AdminNotes
	}

	screenshots := dto.ScreenshotURLs
	if screenshots == nil {
		screenshots = []string{}
	}

	// Resolve claimed winner name from team IDs
	claimedWinner := ""
	if dto.ClaimedWinnerID != nil {
		if dto.TeamAID != nil && *dto.ClaimedWinnerID == *dto.TeamAID {
			claimedWinner = dto.TeamAName
		} else if dto.TeamBID != nil && *dto.ClaimedWinnerID == *dto.TeamBID {
			claimedWinner = dto.TeamBName
		}
	}

	// Auto-matched: approved without an admin verifier
	isAutoMatched := dto.Status == "approved" && dto.VerifiedBy == nil

	return adminSubmissionView{
		ID:               dto.ID.String(),
		MatchID:          matchID,
		MatchType:        matchType,
		TeamAName:        dto.TeamAName,
		TeamBName:        dto.TeamBName,
		SubmittedTeam:    dto.TeamName,
		GameName:         dto.GameName,
		GameSlug:         dto.GameSlug,
		ClaimedScoreA:    dto.ClaimedScoreA,
		ClaimedScoreB:    dto.ClaimedScoreB,
		ClaimedWinner:    claimedWinner,
		ClaimedPlacement: dto.ClaimedPlacement,
		ClaimedKills:     dto.ClaimedKills,
		KillsP1:          dto.KillsP1,
		KillsP2:          dto.KillsP2,
		KillsP3:          dto.KillsP3,
		KillsP4:          dto.KillsP4,
		Screenshots:      screenshots,
		Status:           dto.Status,
		SubmittedBy:      dto.SubmittedByName,
		SubmittedAt:      dto.CreatedAt.Format(time.RFC3339),
		RejectionReason:  rejReason,
		AdminNotes:       adminNotes,
		IsAutoMatched:    isAutoMatched,
	}
}

// validateScreenshotURL checks that a screenshot URL is a safe local upload path.
// Only /uploads/ paths with safe characters are allowed. External URLs are rejected
// to prevent SSRF and information leakage via attacker-controlled domains.
func validateScreenshotURL(u string) error {
	if len(u) > 2048 {
		return fmt.Errorf("URL screenshot terlalu panjang (maks 2048 karakter)")
	}
	if !strings.HasPrefix(u, "/uploads/") {
		return fmt.Errorf("Screenshot harus menggunakan fitur upload, URL eksternal tidak diizinkan")
	}
	// Block path traversal
	if strings.Contains(u, "..") || strings.Contains(u, "\\") {
		return fmt.Errorf("Path screenshot tidak valid")
	}
	return nil
}

func validateScreenshotURLs(urls []string) error {
	for _, u := range urls {
		if err := validateScreenshotURL(u); err != nil {
			return err
		}
	}
	return nil
}
