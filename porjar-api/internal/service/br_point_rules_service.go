package service

import (
	"context"

	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
)

// GetPointRules returns point rules for a tournament
func (s *BRService) GetPointRules(ctx context.Context, tournamentID uuid.UUID) ([]*model.BRPointRule, error) {
	rules, err := s.pointRuleRepo.ListByTournament(ctx, tournamentID)
	if err != nil {
		return nil, apperror.Wrap(err, "list point rules")
	}
	return rules, nil
}

// UpdatePointRules updates point rules and tournament point config
func (s *BRService) UpdatePointRules(ctx context.Context, tournamentID uuid.UUID, rules []struct {
	Placement int `json:"placement"`
	Points    int `json:"points"`
}, killPointValue *float64, wwcdBonus *int, qualificationThreshold *int, maxLobbyTeams *int) error {
	// Update tournament point config if tournament repo available
	if s.tournamentRepo != nil {
		tournament, err := s.tournamentRepo.FindByID(ctx, tournamentID)
		if err != nil || tournament == nil {
			return apperror.NotFound("TOURNAMENT")
		}

		if killPointValue != nil {
			tournament.KillPointValue = *killPointValue
		}
		if wwcdBonus != nil {
			tournament.WWCDBonus = *wwcdBonus
		}
		if qualificationThreshold != nil {
			tournament.QualificationThreshold = qualificationThreshold
		}
		if maxLobbyTeams != nil {
			tournament.MaxLobbyTeams = maxLobbyTeams
		}

		if err := s.tournamentRepo.Update(ctx, tournament); err != nil {
			return apperror.Wrap(err, "update tournament point config")
		}
	}

	// Delete existing rules
	existingRules, err := s.pointRuleRepo.ListByTournament(ctx, tournamentID)
	if err != nil {
		return apperror.Wrap(err, "list existing point rules")
	}
	for _, rule := range existingRules {
		if err := s.pointRuleRepo.Delete(ctx, rule.ID); err != nil {
			return apperror.Wrap(err, "delete existing point rule")
		}
	}

	// Create new rules
	var newRules []*model.BRPointRule
	for _, r := range rules {
		newRules = append(newRules, &model.BRPointRule{
			ID:           uuid.New(),
			TournamentID: tournamentID,
			Placement:    r.Placement,
			Points:       r.Points,
		})
	}

	if len(newRules) > 0 {
		if err := s.pointRuleRepo.BulkCreate(ctx, newRules); err != nil {
			return apperror.Wrap(err, "bulk create point rules")
		}
	}

	return nil
}

// CreateDefaultPointRules creates the default BR point rules for a tournament
func (s *BRService) CreateDefaultPointRules(ctx context.Context, tournamentID uuid.UUID) error {
	defaultRules := []struct {
		Placement int
		Points    int
	}{
		{1, 15},
		{2, 12},
		{3, 10},
		{4, 8},
		{5, 6},
		{6, 4},
		{7, 2},
		{8, 1},
	}

	var rules []*model.BRPointRule
	for _, dr := range defaultRules {
		rules = append(rules, &model.BRPointRule{
			ID:           uuid.New(),
			TournamentID: tournamentID,
			Placement:    dr.Placement,
			Points:       dr.Points,
		})
	}

	if err := s.pointRuleRepo.BulkCreate(ctx, rules); err != nil {
		return apperror.Wrap(err, "create default point rules")
	}

	return nil
}
