package bracket

import (
	"fmt"
	"math"

	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
)

// GenerateSingleElimination creates all bracket matches for a single elimination tournament.
// It takes the seeded entries (already padded to power of 2), generates standard pairings,
// creates matches for all rounds, and links next_match_id for winner advancement.
// Returns the slice of BracketMatch structs ready to save, and the total number of rounds.
func GenerateSingleElimination(tournamentID uuid.UUID, entries []SeedEntry) ([]*model.BracketMatch, int) {
	n := len(entries)
	if n < 2 {
		return nil, 0
	}

	totalRounds := int(math.Log2(float64(n)))
	totalMatches := n - 1

	// Pre-generate all match IDs so we can link next_match_id
	matchIDs := make([]uuid.UUID, totalMatches)
	for i := range matchIDs {
		matchIDs[i] = uuid.New()
	}

	// Build a lookup from seed number to entry
	seedMap := make(map[int]*SeedEntry)
	for i := range entries {
		seedMap[entries[i].Seed] = &entries[i]
	}

	// Generate round 1 pairings using standard seeding
	pairings := StandardSeedPairing(n)

	matches := make([]*model.BracketMatch, 0, totalMatches)

	// matchIndex tracks which match ID to use
	// Round 1 matches: indices 0..n/2-1
	// Round 2 matches: indices n/2..n/2+n/4-1
	// etc.
	matchIndex := 0

	// Generate round 1 matches
	round1Matches := make([]*model.BracketMatch, 0, len(pairings))
	for i, pair := range pairings {
		seedA := pair[0]
		seedB := pair[1]

		entryA := seedMap[seedA]
		entryB := seedMap[seedB]

		pos := fmt.Sprintf("R1M%d", i+1)
		m := &model.BracketMatch{
			ID:              matchIDs[matchIndex],
			TournamentID:    tournamentID,
			Round:           1,
			MatchNumber:     i + 1,
			BracketPosition: &pos,
			TeamAID:         entryA.TeamID,
			TeamBID:         entryB.TeamID,
			Status:          "pending",
		}
		round1Matches = append(round1Matches, m)
		matches = append(matches, m)
		matchIndex++
	}

	// Generate subsequent round matches
	prevRoundStart := 0
	prevRoundCount := len(pairings)

	for round := 2; round <= totalRounds; round++ {
		roundMatchCount := prevRoundCount / 2
		roundStart := matchIndex

		for i := 0; i < roundMatchCount; i++ {
			pos := fmt.Sprintf("R%dM%d", round, i+1)
			m := &model.BracketMatch{
				ID:              matchIDs[matchIndex],
				TournamentID:    tournamentID,
				Round:           round,
				MatchNumber:     i + 1,
				BracketPosition: &pos,
				Status:          "pending",
			}
			matches = append(matches, m)

			// Link the two feeder matches to this match
			feederIdx1 := prevRoundStart + i*2
			feederIdx2 := prevRoundStart + i*2 + 1
			nextID := matchIDs[matchIndex]
			matches[feederIdx1].NextMatchID = &nextID
			matches[feederIdx2].NextMatchID = &nextID

			matchIndex++
		}

		prevRoundStart = roundStart
		prevRoundCount = roundMatchCount
	}

	return matches, totalRounds
}

// FindBYEMatches returns indices of matches where one or both teams are nil (BYE matches).
// In practice, a BYE match is one where exactly one team is nil.
func FindBYEMatches(matches []*model.BracketMatch) []int {
	var byeIndices []int
	for i, m := range matches {
		if m.Round == 1 && (m.TeamAID == nil || m.TeamBID == nil) {
			byeIndices = append(byeIndices, i)
		}
	}
	return byeIndices
}
