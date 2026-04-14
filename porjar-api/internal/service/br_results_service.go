package service

import (
	"context"
	"math"
	"time"

	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
)

// ResultInput represents the input for a single team's result in a lobby
type ResultInput struct {
	TeamID        uuid.UUID `json:"team_id"`
	Placement     int       `json:"placement"`
	Kills         int       `json:"kills"`
	Status        string    `json:"status"`
	PenaltyPoints int       `json:"penalty_points"`
	PenaltyReason *string   `json:"penalty_reason"`
	DamageDealt   int       `json:"damage_dealt"`
	SurvivalBonus int       `json:"survival_bonus"`
}

// PlayerResultInput represents the input for a single player's result
type PlayerResultInput struct {
	UserID              uuid.UUID `json:"user_id"`
	Kills               int       `json:"kills"`
	Damage              int       `json:"damage"`
	IsMVP               bool      `json:"is_mvp"`
	SurvivalTimeSeconds *int      `json:"survival_time_seconds"`
}

// InputResults records results for a specific map within a lobby, calculates points,
// recalculates standings, and broadcasts updates.
// mapNumber is 1-based.
func (s *BRService) InputResults(ctx context.Context, lobbyID uuid.UUID, mapNumber int, results []ResultInput) error {
	if mapNumber <= 0 {
		return apperror.New("INVALID_MAP_NUMBER", "Nomor map tidak valid", 400)
	}

	lobby, err := s.lobbyRepo.FindByID(ctx, lobbyID)
	if err != nil || lobby == nil {
		return apperror.NotFound("LOBBY")
	}

	numMaps := lobby.NumMaps
	if numMaps < 1 {
		numMaps = 1
	}
	if mapNumber > numMaps {
		return apperror.BusinessRule("INVALID_MAP", "Map number melebihi jumlah map pada POT ini")
	}

	// Load tournament for point config
	var tournament *model.Tournament
	if s.tournamentRepo != nil {
		tournament, err = s.tournamentRepo.FindByID(ctx, lobby.TournamentID)
		if err != nil {
			return apperror.Wrap(err, "load tournament")
		}
	}

	// Load point rules for this tournament
	rules, err := s.pointRuleRepo.ListByTournament(ctx, lobby.TournamentID)
	if err != nil {
		return apperror.Wrap(err, "load point rules")
	}

	// Build placement -> points map
	placementPoints := make(map[int]int)
	maxDefinedPlacement := 0
	minPointsForMax := 0
	for _, rule := range rules {
		placementPoints[rule.Placement] = rule.Points
		if rule.Placement > maxDefinedPlacement {
			maxDefinedPlacement = rule.Placement
			minPointsForMax = rule.Points
		}
	}

	// Get kill point value and WWCD bonus from tournament config
	killPointValue := 1.0
	wwcdBonus := 0
	if tournament != nil {
		if tournament.KillPointValue > 0 {
			killPointValue = tournament.KillPointValue
		}
		wwcdBonus = tournament.WWCDBonus
	}

	// Validate placement values
	for _, r := range results {
		if r.Placement < 1 {
			return apperror.BusinessRule("INVALID_PLACEMENT", "Placement harus minimal 1")
		}
	}

	// Calculate points for each result
	var lobbyResults []*model.BRLobbyResult
	for _, r := range results {
		pp, ok := placementPoints[r.Placement]
		if !ok {
			if r.Placement > maxDefinedPlacement {
				pp = 0 // beyond defined rules = 0 placement points
			} else {
				pp = minPointsForMax // gap within defined range
			}
		}

		// Kill points: kills * kill_point_value (rounded, not truncated)
		kp := int(math.Round(float64(r.Kills) * killPointValue))

		// WWCD bonus: if placement == 1, add wwcd_bonus
		wwcd := 0
		if r.Placement == 1 {
			wwcd = wwcdBonus
		}

		// Status defaults to normal
		status := r.Status
		if status == "" {
			status = "normal"
		}

		// Total = placement_points + kill_points + wwcd_bonus + survival_bonus - penalty_points
		tp := pp + kp + wwcd + r.SurvivalBonus - r.PenaltyPoints

		lobbyResults = append(lobbyResults, &model.BRLobbyResult{
			ID:              uuid.New(),
			LobbyID:         lobbyID,
			TeamID:          r.TeamID,
			MapNumber:       mapNumber,
			Placement:       r.Placement,
			Kills:           r.Kills,
			PlacementPoints: pp,
			KillPoints:      kp,
			TotalPoints:     tp,
			Status:          status,
			PenaltyPoints:   r.PenaltyPoints,
			PenaltyReason:   r.PenaltyReason,
			DamageDealt:     r.DamageDealt,
			SurvivalBonus:   r.SurvivalBonus,
		})
	}

	// Delete existing results for this lobby+map (allows re-input)
	if err := s.resultRepo.DeleteByLobbyAndMap(ctx, lobbyID, mapNumber); err != nil {
		return apperror.Wrap(err, "delete existing results for map")
	}

	// Bulk create new results
	if err := s.resultRepo.BulkCreate(ctx, lobbyResults); err != nil {
		return apperror.Wrap(err, "bulk create results")
	}

	// Mark lobby as completed only when all maps have results
	allMapsSubmitted, err := s.allMapsSubmitted(ctx, lobbyID, numMaps)
	if err != nil {
		return apperror.Wrap(err, "check map submission status")
	}
	if allMapsSubmitted && lobby.Status != "completed" {
		now := time.Now()
		lobby.Status = "completed"
		lobby.CompletedAt = &now
		if err := s.lobbyRepo.Update(ctx, lobby); err != nil {
			return apperror.Wrap(err, "update lobby completed")
		}
	}

	// Recalculate cumulative standings across ALL lobbies for this tournament
	if err := s.recalculateStandings(ctx, lobby.TournamentID); err != nil {
		return apperror.Wrap(err, "recalculate standings")
	}

	// Broadcast via WebSocket
	s.broadcastResults(lobby.TournamentID, lobbyID)

	return nil
}

// allMapsSubmitted checks whether every map (1..numMaps) has at least one result row.
func (s *BRService) allMapsSubmitted(ctx context.Context, lobbyID uuid.UUID, numMaps int) (bool, error) {
	counts, err := s.resultRepo.CountMapResultsByLobby(ctx, lobbyID)
	if err != nil {
		return false, err
	}
	for m := 1; m <= numMaps; m++ {
		if counts[m] == 0 {
			return false, nil
		}
	}
	return true, nil
}

// InputPlayerResults saves per-player kills/damage for a lobby result
func (s *BRService) InputPlayerResults(ctx context.Context, lobbyResultID uuid.UUID, players []PlayerResultInput) error {
	if s.playerResultRepo == nil {
		return apperror.BusinessRule("NOT_CONFIGURED", "Player result repo belum dikonfigurasi")
	}

	// Verify lobby result exists
	result, err := s.resultRepo.FindByID(ctx, lobbyResultID)
	if err != nil || result == nil {
		return apperror.NotFound("LOBBY_RESULT")
	}

	now := time.Now()
	var playerResults []*model.BRPlayerResult
	for _, p := range players {
		playerResults = append(playerResults, &model.BRPlayerResult{
			ID:                  uuid.New(),
			LobbyResultID:      lobbyResultID,
			UserID:              p.UserID,
			Kills:               p.Kills,
			Damage:              p.Damage,
			IsMVP:               p.IsMVP,
			SurvivalTimeSeconds: p.SurvivalTimeSeconds,
			CreatedAt:           now,
		})
	}

	if err := s.playerResultRepo.BulkCreate(ctx, playerResults); err != nil {
		return apperror.Wrap(err, "bulk create player results")
	}

	return nil
}
