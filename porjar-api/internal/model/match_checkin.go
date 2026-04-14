package model

import (
	"time"

	"github.com/google/uuid"
)

type MatchCheckin struct {
	ID          int64      `json:"id" db:"id"`
	MatchID     uuid.UUID  `json:"match_id" db:"match_id"`
	MatchType   string     `json:"match_type" db:"match_type"`
	TeamID      uuid.UUID  `json:"team_id" db:"team_id"`
	TeamSide    string     `json:"team_side" db:"team_side"`
	CheckedInBy *uuid.UUID `json:"checked_in_by,omitempty" db:"checked_in_by"`
	CheckedInAt time.Time  `json:"checked_in_at" db:"checked_in_at"`
}
