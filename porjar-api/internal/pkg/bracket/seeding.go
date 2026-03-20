package bracket

import (
	"math/rand"

	"github.com/google/uuid"
)

// SeedEntry represents a team with its seed number in a bracket.
type SeedEntry struct {
	TeamID *uuid.UUID
	Seed   int
}

// ApplySeeding assigns seeds to teams. If manualSeeds is provided (map of teamID -> seed),
// those take priority. Remaining teams get random seeds.
func ApplySeeding(teamIDs []uuid.UUID, manualSeeds map[uuid.UUID]int) []SeedEntry {
	used := make(map[int]bool)
	result := make([]SeedEntry, 0, len(teamIDs))
	var unseeded []uuid.UUID

	// First pass: assign manual seeds
	for _, tid := range teamIDs {
		if seed, ok := manualSeeds[tid]; ok {
			id := tid
			result = append(result, SeedEntry{TeamID: &id, Seed: seed})
			used[seed] = true
		} else {
			unseeded = append(unseeded, tid)
		}
	}

	// Collect available seed numbers
	var available []int
	for i := 1; i <= len(teamIDs); i++ {
		if !used[i] {
			available = append(available, i)
		}
	}

	// Shuffle available seeds for random assignment
	rand.Shuffle(len(available), func(i, j int) {
		available[i], available[j] = available[j], available[i]
	})

	// Assign remaining
	for i, tid := range unseeded {
		id := tid
		result = append(result, SeedEntry{TeamID: &id, Seed: available[i]})
	}

	// Sort by seed
	sortBySeed(result)
	return result
}

// PadToPowerOfTwo pads the seeded entries to the nearest power of 2 with nil (BYE) entries.
// The BYE entries get the highest seed numbers.
func PadToPowerOfTwo(entries []SeedEntry) []SeedEntry {
	n := len(entries)
	size := nextPowerOfTwo(n)

	for i := n + 1; i <= size; i++ {
		entries = append(entries, SeedEntry{TeamID: nil, Seed: i})
	}

	return entries
}

// StandardSeedPairing generates standard tournament seed matchup pairs for n participants.
// For n=8: [[1,8],[4,5],[2,7],[3,6]] — the classic bracket order where
// the 1-seed half and 2-seed half are on opposite sides.
func StandardSeedPairing(n int) [][2]int {
	if n < 2 {
		return nil
	}
	// n must be a power of 2
	return buildPairings(1, n)
}

// buildPairings recursively generates standard seed pairings.
// For a sub-bracket from seed range, the top seed faces the bottom seed,
// and we recurse on the two halves.
func buildPairings(low, high int) [][2]int {
	if high-low < 1 {
		return nil
	}
	if high-low == 1 {
		return [][2]int{{low, high}}
	}

	return standardPairingsIterative(low, high)
}

// standardPairingsIterative generates pairs using the standard tournament bracket method.
// Seed 1 plays seed N, seed 2 plays seed N-1, etc., but arranged so that
// if higher seeds always win, seed 1 meets seed 2 in the final.
func standardPairingsIterative(low, high int) [][2]int {
	n := high - low + 1
	// Start with first round: [1]
	slots := []int{1}

	// Build bracket slots through each round
	for len(slots) < n {
		nextSize := len(slots) * 2
		newSlots := make([]int, nextSize)
		for i, s := range slots {
			newSlots[i*2] = s
			newSlots[i*2+1] = nextSize + 1 - s
		}
		slots = newSlots
	}

	// Convert to pairs
	pairs := make([][2]int, 0, n/2)
	for i := 0; i < len(slots); i += 2 {
		a := slots[i] + low - 1
		b := slots[i+1] + low - 1
		pairs = append(pairs, [2]int{a, b})
	}

	return pairs
}

func nextPowerOfTwo(n int) int {
	p := 1
	for p < n {
		p *= 2
	}
	return p
}

func sortBySeed(entries []SeedEntry) {
	for i := 1; i < len(entries); i++ {
		key := entries[i]
		j := i - 1
		for j >= 0 && entries[j].Seed > key.Seed {
			entries[j+1] = entries[j]
			j--
		}
		entries[j+1] = key
	}
}
