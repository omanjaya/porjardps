package service

import (
	"context"
	"fmt"
	"math"
	"time"

	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
	"github.com/porjar-denpasar/porjar-api/internal/ws"
)

// SubmitBRResult allows a participant to submit BR lobby result with screenshot evidence.
// killsP1-P4 are per-player kill counts; they are auto-summed into the total claimed_kills.
// mapNumber specifies which map of the lobby is being submitted (1-based, defaults to 1).
func (s *MatchSubmissionService) SubmitBRResult(
	ctx context.Context,
	lobbyID uuid.UUID,
	teamID uuid.UUID,
	submittedBy uuid.UUID,
	mapNumber int,
	placement, killsP1, killsP2, killsP3, killsP4 int,
	screenshotURLs []string,
) (*model.MatchSubmission, error) {
	kills := killsP1 + killsP2 + killsP3 + killsP4
	// Validate lobby exists
	lobby, err := s.brLobbyRepo.FindByID(ctx, lobbyID)
	if err != nil || lobby == nil {
		return nil, apperror.NotFound("LOBBY")
	}

	// Default map_number to 1
	if mapNumber <= 0 {
		mapNumber = 1
	}

	// Validate map_number against lobby's num_maps
	numMaps := lobby.NumMaps
	if numMaps <= 0 {
		numMaps = 1
	}
	if mapNumber > numMaps {
		return nil, apperror.BusinessRule("INVALID_MAP_NUMBER", fmt.Sprintf("Map %d tidak valid, lobby ini hanya memiliki %d map", mapNumber, numMaps))
	}

	// Validate lobby status — player submissions only allowed when lobby is live,
	// or scheduled but tournament window is currently active.
	// Completed lobbies are admin-only (manual input).
	if lobby.Status != "live" && (lobby.Status != "scheduled" || !s.isTournamentLiveNow(ctx, lobby.TournamentID)) {
		return nil, apperror.BusinessRule("LOBBY_NOT_ACTIVE", "Hanya bisa mengirim hasil saat lobby sedang berlangsung (live)")
	}

	// Sequential gate: if submitting map > 1, previous map must have been approved
	if mapNumber > 1 {
		prevApproved, err := s.submissionRepo.FindApprovedByLobbyTeamMap(ctx, lobbyID, teamID, mapNumber-1)
		if err != nil {
			return nil, apperror.Wrap(err, "check previous map approval")
		}
		if prevApproved == nil {
			return nil, apperror.BusinessRule("PREVIOUS_MAP_NOT_APPROVED",
				fmt.Sprintf("Map %d belum disetujui admin, tidak bisa mengirim Map %d", mapNumber-1, mapNumber))
		}
	}

	// Validate submitting user is a member of the team and team is in the lobby.
	// Use generic error to prevent enumeration of lobby/team relationships.
	const brSubmitDenied = "Anda tidak dapat submit hasil untuk lobby ini"
	member, _ := s.teamMemberRepo.FindByTeamAndUser(ctx, teamID, submittedBy)
	if member == nil {
		return nil, apperror.BusinessRule("SUBMIT_DENIED", brSubmitDenied)
	}

	// Validate team is a participant in this lobby
	lobbyTeams, _ := s.brLobbyTeamRepo.FindByLobby(ctx, lobbyID)
	teamInLobby := false
	for _, lt := range lobbyTeams {
		if lt.TeamID == teamID {
			teamInLobby = true
			break
		}
	}
	if !teamInLobby {
		return nil, apperror.BusinessRule("SUBMIT_DENIED", brSubmitDenied)
	}

	// Validate screenshots provided
	if len(screenshotURLs) == 0 {
		return nil, apperror.ValidationError(map[string]string{
			"screenshot_urls": "Minimal satu screenshot bukti harus diupload",
		})
	}
	if len(screenshotURLs) > 2 {
		return nil, apperror.ValidationError(map[string]string{
			"screenshot_urls": "Maksimal 2 screenshot untuk Battle Royale",
		})
	}

	// Validate placement
	if placement < 1 {
		return nil, apperror.ValidationError(map[string]string{
			"placement": "Placement harus minimal 1",
		})
	}

	// Game-specific placement validation
	gameSlug, _ := s.getGameSlugForTeam(ctx, teamID)
	maxPlacement := 100 // default
	switch gameSlug {
	case "pubgm":
		maxPlacement = 25
	case "ff":
		maxPlacement = 18
	}
	if placement > maxPlacement {
		return nil, apperror.ValidationError(map[string]string{
			"placement": fmt.Sprintf("Placement maksimal %d untuk game ini", maxPlacement),
		})
	}

	// Also cap placement by actual number of teams in this lobby
	if len(lobbyTeams) > 0 && placement > len(lobbyTeams) {
		return nil, apperror.ValidationError(map[string]string{
			"placement": fmt.Sprintf("Placement maksimal %d (jumlah tim di lobby ini)", len(lobbyTeams)),
		})
	}

	// Acquire Redis lock to prevent race condition duplicate submissions
	lockKey := fmt.Sprintf("br-submit:%s:%s:%d", lobbyID.String(), teamID.String(), mapNumber)
	if s.rdb != nil {
		ok, err := s.rdb.SetNX(ctx, lockKey, "1", 10*time.Second).Result()
		if err != nil {
			return nil, apperror.Wrap(err, "acquire submission lock")
		}
		if !ok {
			return nil, apperror.BusinessRule("SUBMISSION_IN_PROGRESS", "Submission sedang diproses, coba lagi")
		}
		defer s.rdb.Del(ctx, lockKey)
	}

	// Check no duplicate pending submission from same team for the same map
	existing, err := s.submissionRepo.FindByLobby(ctx, lobbyID)
	if err != nil {
		return nil, apperror.Wrap(err, "check existing lobby submissions")
	}
	for _, sub := range existing {
		subMap := sub.MapNumber
		if subMap <= 0 {
			subMap = 1
		}
		if sub.TeamID == teamID && (sub.Status == "pending" || sub.Status == "approved") && subMap == mapNumber {
			return nil, apperror.Conflict("DUPLICATE_SUBMISSION", fmt.Sprintf("Tim Anda sudah memiliki submission untuk Map %d lobby ini", mapNumber))
		}
	}

	submission := &model.MatchSubmission{
		ID:               uuid.New(),
		BRLobbyID:        &lobbyID,
		SubmittedBy:      submittedBy,
		TeamID:           teamID,
		ClaimedPlacement: &placement,
		ClaimedKills:     &kills,
		KillsP1:          killsP1,
		KillsP2:          killsP2,
		KillsP3:          killsP3,
		KillsP4:          killsP4,
		ScreenshotURLs:   screenshotURLs,
		Status:           "pending",
		MapNumber:        mapNumber,
	}

	if err := s.submissionRepo.Create(ctx, submission); err != nil {
		return nil, apperror.Wrap(err, "create BR submission")
	}

	// Broadcast new_submission event to all connected clients (admin dashboard)
	if s.hub != nil {
		gameSlug, _ := s.getGameSlugForTeam(ctx, teamID)
		payload, _ := ws.NewBroadcastData("new_submission", map[string]interface{}{
			"submission_id": submission.ID,
			"match_type":    "battle_royale",
			"game_name":     gameSlug,
		})
		s.hub.BroadcastToAll(payload)
	}

	// Send push notification to all subscribed users
	if s.pushSender != nil {
		go s.pushSender.SendPushToAll(context.Background(), "Submission Baru", "Ada submission hasil pertandingan menunggu verifikasi", "/admin/submissions")
	}

	// Broadcast submission event
	s.broadcastSubmission(lobbyID, "br_submission_created", submission)

	// Notify admins of new submission
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
			context.Background(), teamName, gameName, lobby.LobbyName,
		)
	}

	return submission, nil
}

// applyApprovedBRSubmission updates the BR lobby result based on the approved submission,
// calculates points from configured point rules, then recalculates tournament standings.
func (s *MatchSubmissionService) applyApprovedBRSubmission(ctx context.Context, sub *model.MatchSubmission) error {
	if sub.ClaimedPlacement == nil {
		return fmt.Errorf("submission has no claimed placement")
	}
	placement := *sub.ClaimedPlacement

	kills := 0
	if sub.ClaimedKills != nil {
		kills = *sub.ClaimedKills
	}

	// Load lobby to get tournament context
	lobby, err := s.brLobbyRepo.FindByID(ctx, *sub.BRLobbyID)
	if err != nil || lobby == nil {
		return fmt.Errorf("load lobby for approved submission: %w", err)
	}

	// Calculate points using tournament's point rules
	pp, kp, tp := s.calculateBRPoints(ctx, lobby.TournamentID, placement, kills)

	// Determine which map this submission is for
	mapNumber := sub.MapNumber
	if mapNumber <= 0 {
		mapNumber = 1
	}

	// Upsert br_lobby_results (per map)
	existingResult, _ := s.brResultRepo.FindByTeamLobbyAndMap(ctx, sub.TeamID, *sub.BRLobbyID, mapNumber)
	if existingResult != nil {
		existingResult.Placement = placement
		existingResult.Kills = kills
		existingResult.PlacementPoints = pp
		existingResult.KillPoints = kp
		// Incorporate existing SurvivalBonus and PenaltyPoints into total to match admin formula
		existingResult.TotalPoints = tp + existingResult.SurvivalBonus - existingResult.PenaltyPoints
		if err := s.brResultRepo.Update(ctx, existingResult); err != nil {
			return fmt.Errorf("update BR result: %w", err)
		}
	} else {
		result := &model.BRLobbyResult{
			ID:              uuid.New(),
			LobbyID:         *sub.BRLobbyID,
			TeamID:          sub.TeamID,
			MapNumber:       mapNumber,
			Placement:       placement,
			Kills:           kills,
			PlacementPoints: pp,
			KillPoints:      kp,
			TotalPoints:     tp,
			Status:          "normal",
		}
		if err := s.brResultRepo.Create(ctx, result); err != nil {
			return fmt.Errorf("create BR result: %w", err)
		}
	}

	// NOTE: Per-player kills (KillsP1-P4) are stored only in the MatchSubmission record,
	// not in BRLobbyResult which lacks those fields. To retrieve per-player kills,
	// query the approved MatchSubmission for this lobby+team+map instead.

	// Recalculate cumulative standings for this tournament
	if s.brService != nil {
		if err := s.brService.recalculateStandings(ctx, lobby.TournamentID); err != nil {
			return fmt.Errorf("recalculate standings after submission approval: %w", err)
		}

		// Also recalculate daily standings for this lobby's day
		if lobby.DayNumber > 0 {
			if err := s.brService.CalculateDailyStandings(ctx, lobby.TournamentID, lobby.DayNumber); err != nil {
				return fmt.Errorf("recalculate daily standings after submission approval: %w", err)
			}
		}

		// Broadcast the updated BR results/standings so approved player
		// submissions push live to admins (tournament room) and the public
		// live-scores channel, matching the admin direct-entry path.
		s.brService.broadcastResults(lobby.TournamentID, *sub.BRLobbyID)
	}

	return nil
}

// calculateBRPoints computes placement_points, kill_points, and total_points
// using the tournament's configured point rules and kill point value.
func (s *MatchSubmissionService) calculateBRPoints(ctx context.Context, tournamentID uuid.UUID, placement, kills int) (pp, kp, tp int) {
	if s.brService == nil {
		return 0, 0, 0
	}

	rules, err := s.brService.pointRuleRepo.ListByTournament(ctx, tournamentID)
	if err != nil || len(rules) == 0 {
		return 0, 0, 0
	}

	// Build placement → points map, track fallback for beyond-max placements
	placementPoints := make(map[int]int, len(rules))
	maxDefined := 0
	minPointsForMax := 0
	for _, r := range rules {
		placementPoints[r.Placement] = r.Points
		if r.Placement > maxDefined {
			maxDefined = r.Placement
			minPointsForMax = r.Points
		}
	}

	pp, ok := placementPoints[placement]
	if !ok {
		if placement > maxDefined {
			pp = 0 // beyond defined rules = 0 placement points
		} else {
			pp = minPointsForMax // gap within defined range
		}
	}

	// Kill point value and WWCD bonus from tournament config
	killPointValue := 1.0
	wwcdBonus := 0
	if s.tournamentRepo != nil {
		if t, err := s.tournamentRepo.FindByID(ctx, tournamentID); err == nil && t != nil {
			if t.KillPointValue > 0 {
				killPointValue = t.KillPointValue
			}
			wwcdBonus = t.WWCDBonus
		}
	}

	kp = int(math.Round(float64(kills) * killPointValue))
	wwcd := 0
	if placement == 1 {
		wwcd = wwcdBonus
	}
	tp = pp + kp + wwcd

	return pp, kp, tp
}
