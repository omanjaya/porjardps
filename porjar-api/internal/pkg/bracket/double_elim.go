package bracket

import (
	"fmt"
	"math"

	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
)

// GenerateDoubleElimination creates all bracket matches for a double elimination tournament.
// It generates a winners bracket, losers bracket, and a grand final match.
// Returns the slice of BracketMatch structs, total number of rounds, and any error.
func GenerateDoubleElimination(tournamentID uuid.UUID, entries []SeedEntry) ([]*model.BracketMatch, int, error) {
	n := len(entries)
	if n < 2 {
		return nil, 0, fmt.Errorf("need at least 2 entries, got %d", n)
	}

	// n must be power of 2 (caller should pad)
	if n&(n-1) != 0 {
		return nil, 0, fmt.Errorf("entries count must be power of 2, got %d", n)
	}

	winnersRounds := int(math.Log2(float64(n)))

	// --- Winners Bracket ---
	// Same structure as single elimination
	winnersMatchCount := n - 1
	winnersIDs := make([]uuid.UUID, winnersMatchCount)
	for i := range winnersIDs {
		winnersIDs[i] = uuid.New()
	}

	seedMap := make(map[int]*SeedEntry)
	for i := range entries {
		seedMap[entries[i].Seed] = &entries[i]
	}

	pairings := StandardSeedPairing(n)

	var allMatches []*model.BracketMatch

	// Track winners bracket matches by round for linking losers
	// winnersByRound[round] = list of matches in that round (0-indexed round)
	winnersByRound := make([][]*model.BracketMatch, winnersRounds+1) // 1-indexed

	wIdx := 0

	// Winners Round 1
	winnersR1 := make([]*model.BracketMatch, 0, len(pairings))
	for i, pair := range pairings {
		entryA := seedMap[pair[0]]
		entryB := seedMap[pair[1]]

		pos := "winners"
		m := &model.BracketMatch{
			ID:              winnersIDs[wIdx],
			TournamentID:    tournamentID,
			Round:           1,
			MatchNumber:     i + 1,
			BracketPosition: &pos,
			TeamAID:         entryA.TeamID,
			TeamBID:         entryB.TeamID,
			Status:          "pending",
		}
		winnersR1 = append(winnersR1, m)
		allMatches = append(allMatches, m)
		wIdx++
	}
	winnersByRound[1] = winnersR1

	// Winners subsequent rounds
	prevStart := 0
	prevCount := len(pairings)
	for round := 2; round <= winnersRounds; round++ {
		roundCount := prevCount / 2
		roundMatches := make([]*model.BracketMatch, 0, roundCount)

		for i := 0; i < roundCount; i++ {
			pos := "winners"
			m := &model.BracketMatch{
				ID:              winnersIDs[wIdx],
				TournamentID:    tournamentID,
				Round:           round,
				MatchNumber:     i + 1,
				BracketPosition: &pos,
				Status:          "pending",
			}
			allMatches = append(allMatches, m)
			roundMatches = append(roundMatches, m)

			// Link feeder matches
			feeder1 := prevStart + i*2
			feeder2 := prevStart + i*2 + 1
			nextID := winnersIDs[wIdx]
			allMatches[feeder1].NextMatchID = &nextID
			allMatches[feeder2].NextMatchID = &nextID

			wIdx++
		}

		winnersByRound[round] = roundMatches
		prevStart += prevCount
		prevCount = roundCount
	}

	// --- Losers Bracket ---
	// Standard double elimination losers bracket structure for n teams (power of 2):
	//
	// For 8 teams (WR1=4 matches, WR2=2 matches, WR3=1 match):
	//   LR1 (major): 4 WR1 losers paired -> 2 matches
	//   LR2 (major): 2 WR2 losers vs 2 LR1 winners -> 2 matches
	//   LR3 (minor): 2 LR2 winners paired -> 1 match
	//   Grand Final: WR3 winner vs LR3 winner
	//
	// For 16 teams (WR1=8, WR2=4, WR3=2, WR4=1):
	//   LR1 (major): 8 WR1 losers -> 4 matches
	//   LR2 (major): 4 WR2 losers vs 4 LR1 winners -> 4 matches
	//   LR3 (minor): 4 LR2 winners -> 2 matches
	//   LR4 (major): 2 WR3 losers vs 2 LR3 winners -> 2 matches
	//   LR5 (minor): 2 LR4 winners -> 1 match
	//   Grand Final
	//
	// Pattern: first major (pair WR1 losers), then for each subsequent winners round drop:
	//   major round (drops vs survivors), then minor round (halve survivors) if count > 1

	var losersMatches []*model.BracketMatch
	losersRoundNum := winnersRounds // start numbering losers rounds after winners

	// Track the current "alive" set in losers bracket
	var prevLosersRoundMatches []*model.BracketMatch

	// createLosersRound is a helper to create a set of losers bracket matches
	createLosersRound := func(count int) []*model.BracketMatch {
		losersRoundNum++
		roundMatches := make([]*model.BracketMatch, 0, count)
		for i := 0; i < count; i++ {
			pos := "losers"
			lID := uuid.New()
			m := &model.BracketMatch{
				ID:              lID,
				TournamentID:    tournamentID,
				Round:           losersRoundNum,
				MatchNumber:     i + 1,
				BracketPosition: &pos,
				Status:          "pending",
			}
			roundMatches = append(roundMatches, m)
			losersMatches = append(losersMatches, m)
		}
		return roundMatches
	}

	// Step 1: First major round - pair WR1 losers
	wr1Matches := winnersByRound[1]
	lr1Count := len(wr1Matches) / 2
	lr1 := createLosersRound(lr1Count)
	for i := 0; i < lr1Count; i++ {
		loserNextID := lr1[i].ID
		wr1Matches[i*2].LoserNextMatchID = &loserNextID
		wr1Matches[i*2+1].LoserNextMatchID = &loserNextID
	}
	prevLosersRoundMatches = lr1

	// Step 2: For each subsequent winners round (2 through winnersRounds-1),
	// create a major round (drops vs survivors) and then a minor round (halve)
	for wRound := 2; wRound < winnersRounds; wRound++ {
		droppedFrom := winnersByRound[wRound]
		dropCount := len(droppedFrom)
		survivorCount := len(prevLosersRoundMatches)

		// Major round: drops from this winners round vs losers bracket survivors
		// dropCount should equal survivorCount at this point
		majorCount := dropCount
		if survivorCount < majorCount {
			majorCount = survivorCount
		}
		majorRound := createLosersRound(majorCount)
		for i := 0; i < majorCount; i++ {
			// Link loser from winners round to this match
			loserNextID := majorRound[i].ID
			droppedFrom[i].LoserNextMatchID = &loserNextID

			// Link previous losers round winner to this match
			nextID := majorRound[i].ID
			prevLosersRoundMatches[i].NextMatchID = &nextID
		}
		prevLosersRoundMatches = majorRound

		// Minor round: halve the survivors if more than 1
		if len(prevLosersRoundMatches) > 1 {
			minorCount := len(prevLosersRoundMatches) / 2
			minorRound := createLosersRound(minorCount)
			for i := 0; i < minorCount; i++ {
				nextID := minorRound[i].ID
				prevLosersRoundMatches[i*2].NextMatchID = &nextID
				prevLosersRoundMatches[i*2+1].NextMatchID = &nextID
			}
			prevLosersRoundMatches = minorRound
		}
	}

	allMatches = append(allMatches, losersMatches...)

	// --- Grand Final ---
	losersRoundNum++
	grandFinalID := uuid.New()
	pos := "grand_final"
	grandFinal := &model.BracketMatch{
		ID:              grandFinalID,
		TournamentID:    tournamentID,
		Round:           losersRoundNum,
		MatchNumber:     1,
		BracketPosition: &pos,
		Status:          "pending",
	}
	allMatches = append(allMatches, grandFinal)

	// Link winners final to grand final
	winnersFinal := winnersByRound[winnersRounds][0]
	gfID := grandFinalID
	winnersFinal.NextMatchID = &gfID

	// Link losers final to grand final
	if len(prevLosersRoundMatches) == 1 {
		prevLosersRoundMatches[0].NextMatchID = &gfID
	}

	totalRounds := losersRoundNum
	return allMatches, totalRounds, nil
}
