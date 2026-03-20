package bracket

import (
	"fmt"

	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
)

// GenerateRoundRobin creates a round robin schedule where every team plays every other team once.
// Uses the circle method for balanced scheduling.
// Returns the slice of BracketMatch structs, total number of rounds, and any error.
func GenerateRoundRobin(tournamentID uuid.UUID, teams []SeedEntry) ([]*model.BracketMatch, int, error) {
	n := len(teams)
	if n < 2 {
		return nil, 0, fmt.Errorf("need at least 2 teams, got %d", n)
	}

	// For the circle method, we need an even number of participants.
	// If odd, add a dummy (BYE) entry.
	entries := make([]SeedEntry, len(teams))
	copy(entries, teams)

	if n%2 != 0 {
		entries = append(entries, SeedEntry{TeamID: nil, Seed: n + 1})
	}

	count := len(entries) // even number
	totalRounds := count - 1
	matchesPerRound := count / 2

	var allMatches []*model.BracketMatch
	matchNum := 0

	// Circle method: fix entries[0], rotate the rest.
	// Round r: pair entries[0] with entries[count-1-r_offset], etc.
	// We use a rotating slice.
	rotating := make([]SeedEntry, count-1)
	copy(rotating, entries[1:])

	for round := 1; round <= totalRounds; round++ {
		// Pairs for this round:
		// entries[0] vs rotating[0]
		// rotating[1] vs rotating[len-1]
		// rotating[2] vs rotating[len-2]
		// etc.
		for i := 0; i < matchesPerRound; i++ {
			var a, b SeedEntry
			if i == 0 {
				a = entries[0]
				b = rotating[0]
			} else {
				a = rotating[i]
				b = rotating[len(rotating)-i]
			}

			// Skip BYE matches (where one team is nil)
			if a.TeamID == nil || b.TeamID == nil {
				continue
			}

			matchNum++
			pos := fmt.Sprintf("RR-R%dM%d", round, i+1)
			m := &model.BracketMatch{
				ID:              uuid.New(),
				TournamentID:    tournamentID,
				Round:           round,
				MatchNumber:     matchNum,
				BracketPosition: &pos,
				TeamAID:         a.TeamID,
				TeamBID:         b.TeamID,
				Status:          "pending",
			}
			allMatches = append(allMatches, m)
		}

		// Rotate: move last element to front
		last := rotating[len(rotating)-1]
		copy(rotating[1:], rotating[:len(rotating)-1])
		rotating[0] = last
	}

	return allMatches, totalRounds, nil
}
