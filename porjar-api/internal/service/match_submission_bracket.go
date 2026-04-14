package service

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
	"github.com/porjar-denpasar/porjar-api/internal/ws"
)

// SubmitBracketResult allows a participant to submit match result with screenshot evidence.
// Winner is automatically derived from the score (higher score = winner).
func (s *MatchSubmissionService) SubmitBracketResult(
	ctx context.Context,
	matchID uuid.UUID,
	teamID uuid.UUID,
	submittedBy uuid.UUID,
	scoreA, scoreB int,
	screenshotURLs []string,
) (*model.MatchSubmission, error) {
	match, err := s.bracketRepo.FindByID(ctx, matchID)
	if err != nil || match == nil {
		return nil, apperror.NotFound("MATCH")
	}

	// Validate participation: team must be in the match AND user must be a team member.
	// Use a single generic error to prevent enumeration of match/team relationships.
	const submitDenied = "Anda tidak dapat submit hasil untuk match ini"

	if match.Status != "live" && match.Status != "scheduled" {
		return nil, apperror.BusinessRule("SUBMIT_DENIED", submitDenied)
	}

	if (match.TeamAID == nil || *match.TeamAID != teamID) && (match.TeamBID == nil || *match.TeamBID != teamID) {
		return nil, apperror.BusinessRule("SUBMIT_DENIED", submitDenied)
	}

	member, _ := s.teamMemberRepo.FindByTeamAndUser(ctx, teamID, submittedBy)
	if member == nil {
		return nil, apperror.BusinessRule("SUBMIT_DENIED", submitDenied)
	}

	if len(screenshotURLs) == 0 {
		return nil, apperror.ValidationError(map[string]string{
			"screenshot_urls": "Minimal satu screenshot bukti harus diupload",
		})
	}

	// Per-game screenshot limit
	gameSlug, _ := s.getGameSlugForTeam(ctx, teamID)
	bestOf := match.BestOf
	if bestOf <= 0 {
		bestOf = 1
	}
	maxSS := gameMaxScreenshots(gameSlug, "bracket", bestOf)
	if len(screenshotURLs) > maxSS {
		return nil, apperror.ValidationError(map[string]string{
			"screenshot_urls": fmt.Sprintf("Maksimal %d screenshot untuk game ini", maxSS),
		})
	}

	// Score validation: derive winner from score
	var claimedWinnerID uuid.UUID
	if gameSlug == "efootball" {
		if scoreA < 0 || scoreB < 0 {
			return nil, apperror.ValidationError(map[string]string{"score": "Skor tidak boleh negatif"})
		}
		if scoreA > 20 || scoreB > 20 {
			return nil, apperror.ValidationError(map[string]string{"score": "Skor tidak masuk akal"})
		}
		if scoreA == scoreB {
			return nil, apperror.ValidationError(map[string]string{"score": "Skor tidak boleh seri, harus ada pemenang"})
		}
		if scoreA > scoreB {
			if match.TeamAID == nil {
				return nil, apperror.BusinessRule("MATCH_NOT_READY", "Match belum memiliki peserta")
			}
			claimedWinnerID = *match.TeamAID
		} else {
			if match.TeamBID == nil {
				return nil, apperror.BusinessRule("MATCH_NOT_READY", "Match belum memiliki peserta")
			}
			claimedWinnerID = *match.TeamBID
		}
	} else {
		if scoreA < 0 || scoreB < 0 {
			return nil, apperror.ValidationError(map[string]string{"score": "Skor tidak boleh negatif"})
		}
		if scoreA == 0 && scoreB == 0 {
			return nil, apperror.ValidationError(map[string]string{"score": "Skor tidak boleh keduanya 0"})
		}
		if scoreA == scoreB {
			return nil, apperror.ValidationError(map[string]string{"score": "Harus ada pemenang, skor tidak boleh seri"})
		}
		if scoreA > scoreB {
			if match.TeamAID == nil {
				return nil, apperror.BusinessRule("MATCH_NOT_READY", "Match belum memiliki peserta")
			}
			claimedWinnerID = *match.TeamAID
		} else {
			if match.TeamBID == nil {
				return nil, apperror.BusinessRule("MATCH_NOT_READY", "Match belum memiliki peserta")
			}
			claimedWinnerID = *match.TeamBID
		}
	}

	// Acquire per-team lock to prevent concurrent requests from getting the same game_number
	submitLockKey := fmt.Sprintf("bracket-submit:%s:%s", matchID.String(), teamID.String())
	if s.rdb != nil {
		ok, lockErr := s.rdb.SetNX(ctx, submitLockKey, "1", 10*time.Second).Result()
		if lockErr != nil {
			slog.Error("SubmitBracketResult: failed to acquire Redis lock", "match_id", matchID, "team_id", teamID, "error", lockErr)
			return nil, apperror.BusinessRule("SUBMIT_LOCK_FAILED", "Submission sedang diproses, coba lagi")
		}
		if !ok {
			return nil, apperror.BusinessRule("SUBMIT_IN_PROGRESS", "Submission sedang diproses, coba lagi")
		}
		defer s.rdb.Del(ctx, submitLockKey)
	}

	// Determine next game_number for this match
	existing, err := s.submissionRepo.FindByMatch(ctx, matchID)
	if err != nil {
		return nil, apperror.Wrap(err, "check existing submissions")
	}

	// Find max approved game number to determine which game to submit next
	approvedSubs, _ := s.submissionRepo.FindApprovedByMatch(ctx, matchID)
	maxApprovedGame := 0
	for _, sub := range approvedSubs {
		if sub.GameNumber > maxApprovedGame {
			maxApprovedGame = sub.GameNumber
		}
	}
	nextGame := maxApprovedGame + 1

	// Validate we haven't exceeded BO limit (deduplicate by game_number)
	winsNeeded := (bestOf / 2) + 1
	approvedGameWinners := make(map[int]uuid.UUID)
	for _, sub := range approvedSubs {
		if sub.ClaimedWinnerID == nil {
			continue
		}
		if _, seen := approvedGameWinners[sub.GameNumber]; !seen {
			approvedGameWinners[sub.GameNumber] = *sub.ClaimedWinnerID
		}
	}
	winsA, winsB := 0, 0
	for _, winnerID := range approvedGameWinners {
		if match.TeamAID != nil && winnerID == *match.TeamAID {
			winsA++
		} else if match.TeamBID != nil && winnerID == *match.TeamBID {
			winsB++
		}
	}
	if winsA >= winsNeeded || winsB >= winsNeeded {
		return nil, apperror.BusinessRule("MATCH_ALREADY_DECIDED", "Seri pertandingan sudah selesai")
	}

	// Check no duplicate pending for same game_number from same team
	for _, sub := range existing {
		if sub.TeamID == teamID && sub.GameNumber == nextGame && sub.Status == "pending" {
			return nil, apperror.Conflict("DUPLICATE_SUBMISSION", "Tim Anda sudah memiliki submission pending untuk game ini")
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
		GameNumber:      nextGame,
	}

	if err := s.submissionRepo.Create(ctx, submission); err != nil {
		return nil, apperror.Wrap(err, "create submission")
	}

	// Broadcast new_submission event to all connected clients (admin dashboard)
	if s.hub != nil {
		payload, _ := ws.NewBroadcastData("new_submission", map[string]interface{}{
			"submission_id": submission.ID,
			"match_type":    "bracket",
			"game_name":     gameSlug,
		})
		s.hub.BroadcastToAll(payload)
	}

	// Send push notification to all subscribed users
	if s.pushSender != nil {
		go s.pushSender.SendPushToAll(context.Background(), "Submission Baru", "Ada submission hasil pertandingan menunggu verifikasi", "/admin/submissions")
	}

	// Try auto-verify if both teams submitted matching results
	// Retry up to 3 times if lock is held by the other team's goroutine
	go func() {
		bgCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		for attempt := 0; attempt < 3; attempt++ {
			if autoApproved, err := s.AutoVerify(bgCtx, matchID); err == nil {
				if autoApproved {
					slog.Info("auto-verify approved match", "match_id", matchID)
				}
				break
			} else {
				slog.Error("auto-verify failed", "match_id", matchID, "attempt", attempt+1, "error", err)
			}
			time.Sleep(1 * time.Second)
		}
	}()

	s.broadcastSubmission(matchID, "submission_created", submission)

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
			fmt.Sprintf("Match #%d Game %d", match.MatchNumber, nextGame),
		)
	}

	return submission, nil
}

// applyApprovedBracketSubmission checks series wins and completes match when decided.
func (s *MatchSubmissionService) applyApprovedBracketSubmission(ctx context.Context, sub *model.MatchSubmission) error {
	match, err := s.bracketRepo.FindByID(ctx, *sub.BracketMatchID)
	if err != nil || match == nil {
		return apperror.Wrap(err, "find bracket match for submission")
	}

	if match.Status == "completed" {
		return nil
	}

	if match.TeamAID == nil || match.TeamBID == nil {
		return apperror.BusinessRule("MATCH_NO_TEAMS", "match has no teams")
	}

	bestOf := match.BestOf
	if bestOf <= 0 {
		bestOf = 1
	}
	winsNeeded := (bestOf / 2) + 1

	// Count wins per team across all approved submissions for this match
	approvedSubs, err := s.submissionRepo.FindApprovedByMatch(ctx, *sub.BracketMatchID)
	if err != nil {
		return apperror.Wrap(err, "find approved submissions")
	}

	// Deduplicate by game_number: if both teams submitted for the same game,
	// resolve conflicts by comparing scores rather than taking first entry.
	gameWinners := make(map[int]uuid.UUID)
	for _, sub := range approvedSubs {
		if sub.ClaimedWinnerID == nil {
			continue
		}
		existing, seen := gameWinners[sub.GameNumber]
		if !seen {
			gameWinners[sub.GameNumber] = *sub.ClaimedWinnerID
		} else if existing != *sub.ClaimedWinnerID {
			// Conflict — determine winner from scores
			if sub.ClaimedScoreA != nil && sub.ClaimedScoreB != nil {
				if *sub.ClaimedScoreA > *sub.ClaimedScoreB {
					gameWinners[sub.GameNumber] = *match.TeamAID
				} else {
					gameWinners[sub.GameNumber] = *match.TeamBID
				}
			}
		}
	}
	winsA, winsB := 0, 0
	for _, winnerID := range gameWinners {
		if winnerID == *match.TeamAID {
			winsA++
		} else if winnerID == *match.TeamBID {
			winsB++
		}
	}

	slog.Info("applyApprovedBracketSubmission: series status",
		"match_id", *sub.BracketMatchID,
		"best_of", bestOf,
		"wins_needed", winsNeeded,
		"wins_a", winsA,
		"wins_b", winsB,
	)

	// Acquire a distributed lock to prevent concurrent match status mutations
	applyLockKey := fmt.Sprintf("bracket-apply:%s", sub.BracketMatchID.String())
	if s.rdb != nil {
		ok, lockErr := s.rdb.SetNX(ctx, applyLockKey, "1", 30*time.Second).Result()
		if lockErr != nil {
			slog.Error("applyApprovedBracketSubmission: lock failed", "match_id", match.ID, "error", lockErr)
			return apperror.Wrap(lockErr, "acquire bracket apply lock")
		}
		if !ok {
			return apperror.BusinessRule("CONCURRENT_UPDATE", "concurrent match update in progress")
		}
		defer s.rdb.Del(ctx, applyLockKey)
	}

	// Re-fetch match after acquiring lock to get current state (B8)
	match, err = s.bracketRepo.FindByID(ctx, *sub.BracketMatchID)
	if err != nil || match == nil {
		return apperror.Wrap(err, "re-fetch match after lock")
	}
	if match.TeamAID == nil || match.TeamBID == nil {
		return apperror.BusinessRule("MATCH_TEAMS_CHANGED", "match teams changed during processing")
	}

	// Always persist the current series score and ensure match is live
	if match.Status == "pending" || match.Status == "scheduled" {
		match.Status = "live"
	}
	match.ScoreA = &winsA
	match.ScoreB = &winsB
	if updateErr := s.bracketRepo.Update(ctx, match); updateErr != nil {
		slog.Error("failed to update match series score", "match_id", match.ID, "error", updateErr)
	}

	// Series decided — complete the match
	if winsA >= winsNeeded {
		if err := s.bracketService.CompleteMatch(ctx, *sub.BracketMatchID, *match.TeamAID); err != nil {
			return err
		}
		go s.pushMatchResult(context.Background(), match, *match.TeamAID, approvedSubs)
		return nil
	}
	if winsB >= winsNeeded {
		if err := s.bracketService.CompleteMatch(ctx, *sub.BracketMatchID, *match.TeamBID); err != nil {
			return err
		}
		go s.pushMatchResult(context.Background(), match, *match.TeamBID, approvedSubs)
		return nil
	}

	return nil
}

// pushMatchResult sends a push notification to all subscribers after a match is completed.
func (s *MatchSubmissionService) pushMatchResult(ctx context.Context, match *model.BracketMatch, winnerID uuid.UUID, approvedSubs []*model.MatchSubmission) {
	if s.pushSender == nil {
		return
	}

	// Fetch team names
	teamIDs := []uuid.UUID{}
	if match.TeamAID != nil {
		teamIDs = append(teamIDs, *match.TeamAID)
	}
	if match.TeamBID != nil {
		teamIDs = append(teamIDs, *match.TeamBID)
	}
	teamNames := map[uuid.UUID]string{}
	if teams, err := s.teamRepo.FindByIDs(ctx, teamIDs); err == nil {
		for _, t := range teams {
			teamNames[t.ID] = t.Name
		}
	}

	winnerName := "Tim"
	loserName := "Tim"
	if match.TeamAID != nil && match.TeamBID != nil {
		if *match.TeamAID == winnerID {
			winnerName = teamNames[*match.TeamAID]
			loserName = teamNames[*match.TeamBID]
		} else {
			winnerName = teamNames[*match.TeamBID]
			loserName = teamNames[*match.TeamAID]
		}
	}

	// Count game wins (not summed raw scores) for the series score
	winsA, winsB := 0, 0
	seenGames := make(map[int]bool)
	for _, sub := range approvedSubs {
		if seenGames[sub.GameNumber] {
			continue
		}
		seenGames[sub.GameNumber] = true
		if sub.ClaimedWinnerID != nil && match.TeamAID != nil && match.TeamBID != nil {
			if *sub.ClaimedWinnerID == *match.TeamAID {
				winsA++
			} else if *sub.ClaimedWinnerID == *match.TeamBID {
				winsB++
			}
		}
	}
	// Swap so winner score is always shown first
	winScore, loseScore := winsA, winsB
	if match.TeamBID != nil && *match.TeamBID == winnerID {
		winScore, loseScore = winsB, winsA
	}

	// Fetch tournament name
	tournamentName := ""
	if s.tournamentRepo != nil {
		if t, err := s.tournamentRepo.FindByID(ctx, match.TournamentID); err == nil && t != nil {
			// Shorten tournament name for notification
			name := t.Name
			if len(name) > 30 {
				parts := strings.Fields(name)
				if len(parts) >= 2 {
					name = strings.Join(parts[:2], " ")
				} else {
					name = name[:30]
				}
			}
			tournamentName = name
		}
	}

	label := fmt.Sprintf("M%d", match.MatchNumber)
	if tournamentName != "" {
		label = fmt.Sprintf("%s %s", tournamentName, label)
	}

	title := "Hasil Pertandingan"
	body := fmt.Sprintf("%s menang vs %s (%d-%d) · %s", winnerName, loserName, winScore, loseScore, label)
	url := fmt.Sprintf("/tournaments/%s/bracket", match.TournamentID.String())

	s.pushSender.SendPushToAll(ctx, title, body, url)
}
