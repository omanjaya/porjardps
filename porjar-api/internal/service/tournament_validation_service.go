package service

import (
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
)

// validateDateOrder checks that tournament dates are in the correct chronological order.
func validateDateOrder(t *model.Tournament) error {
	if t.RegistrationStart != nil && t.RegistrationEnd != nil {
		if !t.RegistrationStart.Before(*t.RegistrationEnd) {
			return apperror.BusinessRule("INVALID_DATE_ORDER", "Tanggal mulai pendaftaran harus sebelum tanggal akhir pendaftaran")
		}
	}
	if t.RegistrationEnd != nil && t.StartDate != nil {
		if t.RegistrationEnd.After(*t.StartDate) {
			return apperror.BusinessRule("INVALID_DATE_ORDER", "Tanggal akhir pendaftaran harus sebelum atau sama dengan tanggal mulai turnamen")
		}
	}
	if t.StartDate != nil && t.EndDate != nil {
		if t.StartDate.After(*t.EndDate) {
			return apperror.BusinessRule("INVALID_DATE_ORDER", "Tanggal mulai turnamen harus sebelum atau sama dengan tanggal akhir turnamen")
		}
	}
	return nil
}

// isValidFormatForGameType checks if the tournament format is valid for the game type.
func isValidFormatForGameType(format, gameType string) bool {
	switch gameType {
	case "battle_royale":
		return format == "battle_royale" || format == "battle_royale_points" || format == "round_robin"
	default:
		return format == "single_elimination" || format == "double_elimination" || format == "round_robin" || format == "group_stage_playoff" || format == "swiss" || format == "multi_stage"
	}
}
