package bracket

import (
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
)

// helper: create seeded entries with real team IDs (already padded to power of 2 if needed)
func makeEntries(n int) []SeedEntry {
	entries := make([]SeedEntry, n)
	for i := 0; i < n; i++ {
		id := uuid.New()
		entries[i] = SeedEntry{TeamID: &id, Seed: i + 1}
	}
	return entries
}

func TestGenerateSingleElimination_8Teams(t *testing.T) {
	tournamentID := uuid.New()
	entries := makeEntries(8)

	matches, rounds := GenerateSingleElimination(tournamentID, entries)

	assert.Equal(t, 7, len(matches))  // 8-1 = 7 matches
	assert.Equal(t, 3, rounds)        // log2(8) = 3

	// Verify round distribution: 4 R1, 2 R2, 1 R3
	roundCounts := map[int]int{}
	for _, m := range matches {
		roundCounts[m.Round]++
	}
	assert.Equal(t, 4, roundCounts[1])
	assert.Equal(t, 2, roundCounts[2])
	assert.Equal(t, 1, roundCounts[3])

	// All round 1 matches should have both teams
	for _, m := range matches {
		if m.Round == 1 {
			assert.NotNil(t, m.TeamAID, "Round 1 match should have TeamA")
			assert.NotNil(t, m.TeamBID, "Round 1 match should have TeamB")
		}
	}

	// Round 2+ matches should have no teams yet (they advance from round 1)
	for _, m := range matches {
		if m.Round > 1 {
			assert.Nil(t, m.TeamAID, "Round %d match should not have TeamA yet", m.Round)
			assert.Nil(t, m.TeamBID, "Round %d match should not have TeamB yet", m.Round)
		}
	}

	// All round 1 matches should have NextMatchID set
	for _, m := range matches {
		if m.Round == 1 {
			assert.NotNil(t, m.NextMatchID, "Round 1 match should have NextMatchID")
		}
	}

	// Final match should have no NextMatchID
	finalMatch := matches[len(matches)-1]
	assert.Equal(t, 3, finalMatch.Round)
	assert.Nil(t, finalMatch.NextMatchID, "Final match should not have NextMatchID")
}

func TestGenerateSingleElimination_16Teams(t *testing.T) {
	tournamentID := uuid.New()
	entries := makeEntries(16)

	matches, rounds := GenerateSingleElimination(tournamentID, entries)

	assert.Equal(t, 15, len(matches)) // 16-1 = 15 matches
	assert.Equal(t, 4, rounds)        // log2(16) = 4

	roundCounts := map[int]int{}
	for _, m := range matches {
		roundCounts[m.Round]++
	}
	assert.Equal(t, 8, roundCounts[1])
	assert.Equal(t, 4, roundCounts[2])
	assert.Equal(t, 2, roundCounts[3])
	assert.Equal(t, 1, roundCounts[4])
}

func TestGenerateSingleElimination_6Teams_PaddedTo8(t *testing.T) {
	tournamentID := uuid.New()

	// Simulate 6 real teams + 2 BYEs (padded to 8)
	entries := makeEntries(6)
	entries = PadToPowerOfTwo(entries)

	assert.Equal(t, 8, len(entries), "Should be padded to 8")
	assert.Nil(t, entries[6].TeamID, "Entry 7 should be BYE (nil)")
	assert.Nil(t, entries[7].TeamID, "Entry 8 should be BYE (nil)")

	matches, rounds := GenerateSingleElimination(tournamentID, entries)

	assert.Equal(t, 7, len(matches)) // 8-1 = 7
	assert.Equal(t, 3, rounds)

	// Find BYE matches
	byeIndices := FindBYEMatches(matches)
	assert.Equal(t, 2, len(byeIndices), "Should have 2 BYE matches")

	// BYE matches should have exactly one nil team
	for _, idx := range byeIndices {
		m := matches[idx]
		hasNilA := m.TeamAID == nil
		hasNilB := m.TeamBID == nil
		assert.True(t, hasNilA != hasNilB, "BYE match should have exactly one nil team (match %d)", idx)
	}
}

func TestGenerateSingleElimination_2Teams(t *testing.T) {
	tournamentID := uuid.New()
	entries := makeEntries(2)

	matches, rounds := GenerateSingleElimination(tournamentID, entries)

	assert.Equal(t, 1, len(matches)) // single match
	assert.Equal(t, 1, rounds)       // 1 round

	assert.NotNil(t, matches[0].TeamAID)
	assert.NotNil(t, matches[0].TeamBID)
	assert.Nil(t, matches[0].NextMatchID, "Single match should have no next match")
}

func TestGenerateSingleElimination_LessThan2(t *testing.T) {
	tournamentID := uuid.New()

	matches, rounds := GenerateSingleElimination(tournamentID, []SeedEntry{})
	assert.Nil(t, matches)
	assert.Equal(t, 0, rounds)

	entries := makeEntries(1)
	matches, rounds = GenerateSingleElimination(tournamentID, entries)
	assert.Nil(t, matches)
	assert.Equal(t, 0, rounds)
}

// ========================================
// Seeding Tests
// ========================================

func TestStandardSeedPairing_8(t *testing.T) {
	pairs := StandardSeedPairing(8)

	assert.Equal(t, 4, len(pairs), "8 teams should produce 4 pairs")

	// Standard bracket seeding for 8: 1v8, 4v5, 2v7, 3v6
	// (so that 1v2 can happen in the final if top seeds always win)
	expected := [][2]int{{1, 8}, {4, 5}, {2, 7}, {3, 6}}
	assert.Equal(t, expected, pairs)
}

func TestStandardSeedPairing_4(t *testing.T) {
	pairs := StandardSeedPairing(4)

	assert.Equal(t, 2, len(pairs))
	// Standard: 1v4, 2v3
	expected := [][2]int{{1, 4}, {2, 3}}
	assert.Equal(t, expected, pairs)
}

func TestStandardSeedPairing_16(t *testing.T) {
	pairs := StandardSeedPairing(16)

	assert.Equal(t, 8, len(pairs))

	// Verify 1v16 is first pair
	assert.Equal(t, 1, pairs[0][0])
	assert.Equal(t, 16, pairs[0][1])

	// Verify all seeds 1-16 appear exactly once
	seen := make(map[int]bool)
	for _, pair := range pairs {
		seen[pair[0]] = true
		seen[pair[1]] = true
	}
	for i := 1; i <= 16; i++ {
		assert.True(t, seen[i], "Seed %d should appear in pairings", i)
	}
}

func TestPadToPowerOfTwo(t *testing.T) {
	tests := []struct {
		name     string
		count    int
		expected int
	}{
		{"already power of 2", 8, 8},
		{"6 -> 8", 6, 8},
		{"3 -> 4", 3, 4},
		{"5 -> 8", 5, 8},
		{"9 -> 16", 9, 16},
		{"2 stays 2", 2, 2},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			entries := makeEntries(tt.count)
			padded := PadToPowerOfTwo(entries)
			assert.Equal(t, tt.expected, len(padded))

			// Original entries should still have team IDs
			for i := 0; i < tt.count; i++ {
				assert.NotNil(t, padded[i].TeamID, "Original entry %d should keep its TeamID", i)
			}

			// Padded entries should be BYEs (nil TeamID)
			for i := tt.count; i < tt.expected; i++ {
				assert.Nil(t, padded[i].TeamID, "Padded entry %d should be BYE (nil)", i)
			}
		})
	}
}

func TestApplySeeding_ManualSeeds(t *testing.T) {
	teamIDs := make([]uuid.UUID, 4)
	for i := range teamIDs {
		teamIDs[i] = uuid.New()
	}

	manualSeeds := map[uuid.UUID]int{
		teamIDs[0]: 1,
		teamIDs[1]: 4,
	}

	entries := ApplySeeding(teamIDs, manualSeeds)

	assert.Equal(t, 4, len(entries))

	// Verify manually seeded teams got correct seeds
	seedMap := make(map[uuid.UUID]int)
	for _, e := range entries {
		if e.TeamID != nil {
			seedMap[*e.TeamID] = e.Seed
		}
	}
	assert.Equal(t, 1, seedMap[teamIDs[0]])
	assert.Equal(t, 4, seedMap[teamIDs[1]])

	// All seeds 1-4 should be used
	usedSeeds := make(map[int]bool)
	for _, e := range entries {
		usedSeeds[e.Seed] = true
	}
	for i := 1; i <= 4; i++ {
		assert.True(t, usedSeeds[i], "Seed %d should be assigned", i)
	}

	// Entries should be sorted by seed
	for i := 1; i < len(entries); i++ {
		assert.True(t, entries[i].Seed > entries[i-1].Seed, "Entries should be sorted by seed")
	}
}

func TestFindBYEMatches(t *testing.T) {
	tournamentID := uuid.New()
	entries := makeEntries(6)
	entries = PadToPowerOfTwo(entries)

	matches, _ := GenerateSingleElimination(tournamentID, entries)
	byeIndices := FindBYEMatches(matches)

	assert.Equal(t, 2, len(byeIndices))

	for _, idx := range byeIndices {
		m := matches[idx]
		assert.Equal(t, 1, m.Round, "BYE matches should be in round 1")
	}
}
