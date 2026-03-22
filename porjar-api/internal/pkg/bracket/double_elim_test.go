package bracket

import (
	"testing"

	"github.com/google/uuid"
)

func TestGenerateDoubleElimination_8Teams(t *testing.T) {
	tournamentID := uuid.New()
	entries := makeEntries(8)

	matches, totalRounds, err := GenerateDoubleElimination(tournamentID, entries)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Count by bracket position
	winnersCount := 0
	losersCount := 0
	grandFinalCount := 0
	for _, m := range matches {
		if m.BracketPosition == nil {
			t.Fatal("bracket_position should not be nil")
		}
		switch *m.BracketPosition {
		case "winners":
			winnersCount++
		case "losers":
			losersCount++
		case "grand_final":
			grandFinalCount++
		default:
			t.Fatalf("unexpected bracket_position: %s", *m.BracketPosition)
		}
	}

	// Winners bracket: 8 teams -> 4 + 2 + 1 = 7 matches
	if winnersCount != 7 {
		t.Errorf("expected 7 winners matches, got %d", winnersCount)
	}

	// Grand final: 1 match
	if grandFinalCount != 1 {
		t.Errorf("expected 1 grand final match, got %d", grandFinalCount)
	}

	// Losers bracket for 8 teams (WR final loser is eliminated, not dropped to LR):
	// Step 1 - LR1 major: 4 WR1 losers paired → 2 matches
	// wRound=2 - LR2 major: 2 WR2 losers vs 2 LR1 winners → 2 matches
	// wRound=2 - LR3 minor: 2 LR2 winners halved → 1 match
	// Total losers = 2+2+1 = 5
	// Grand final: WR3 winner vs LR3 winner → 1 match
	// Grand total: 7 + 5 + 1 = 13  (formula: 2n-3 = 2*8-3 = 13)
	if losersCount != 5 {
		t.Errorf("expected 5 losers matches for 8 teams, got %d", losersCount)
	}

	if len(matches) != 13 {
		t.Errorf("expected 13 total matches for 8 teams (2n-3), got %d", len(matches))
	}

	t.Logf("Total matches: %d (winners=%d, losers=%d, grand_final=%d), rounds=%d", len(matches), winnersCount, losersCount, grandFinalCount, totalRounds)

	// Verify all matches have tournament ID
	for _, m := range matches {
		if m.TournamentID != tournamentID {
			t.Error("tournament ID mismatch")
		}
	}
}

func TestGenerateDoubleElimination_4Teams(t *testing.T) {
	// 4 teams: WR=3, LR=1, GF=1, Total=5 (2*4-3=5)
	matches, _, err := GenerateDoubleElimination(uuid.New(), makeEntries(4))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	wCount, lCount, gfCount := countByPosition(matches)
	if wCount != 3 {
		t.Errorf("4 teams: expected 3 winners matches, got %d", wCount)
	}
	if lCount != 1 {
		t.Errorf("4 teams: expected 1 losers match, got %d", lCount)
	}
	if gfCount != 1 {
		t.Errorf("4 teams: expected 1 grand final, got %d", gfCount)
	}
	if len(matches) != 5 {
		t.Errorf("4 teams: expected 5 total matches, got %d", len(matches))
	}
}

func TestGenerateDoubleElimination_16Teams(t *testing.T) {
	// 16 teams: WR=15, LR=13, GF=1, Total=29 (2*16-3=29)
	matches, _, err := GenerateDoubleElimination(uuid.New(), makeEntries(16))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	wCount, lCount, gfCount := countByPosition(matches)
	if wCount != 15 {
		t.Errorf("16 teams: expected 15 winners matches, got %d", wCount)
	}
	if lCount != 13 {
		t.Errorf("16 teams: expected 13 losers matches, got %d", lCount)
	}
	if gfCount != 1 {
		t.Errorf("16 teams: expected 1 grand final, got %d", gfCount)
	}
	if len(matches) != 29 {
		t.Errorf("16 teams: expected 29 total matches, got %d", len(matches))
	}
}

func countByPosition(matches []*model.BracketMatch) (winners, losers, grandFinal int) {
	for _, m := range matches {
		if m.BracketPosition == nil {
			continue
		}
		switch *m.BracketPosition {
		case "winners":
			winners++
		case "losers":
			losers++
		case "grand_final":
			grandFinal++
		}
	}
	return
}

func TestGenerateDoubleElimination_BracketPositionSet(t *testing.T) {
	tournamentID := uuid.New()
	entries := makeEntries(4)

	matches, _, err := GenerateDoubleElimination(tournamentID, entries)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	for _, m := range matches {
		if m.BracketPosition == nil {
			t.Fatal("bracket_position should not be nil on any match")
		}
		pos := *m.BracketPosition
		if pos != "winners" && pos != "losers" && pos != "grand_final" {
			t.Errorf("unexpected bracket_position: %s", pos)
		}
	}
}

func TestGenerateDoubleElimination_LoserNextMatchLinked(t *testing.T) {
	tournamentID := uuid.New()
	entries := makeEntries(8)

	matches, _, err := GenerateDoubleElimination(tournamentID, entries)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Check that some winners bracket matches have LoserNextMatchID set
	losersLinked := 0
	for _, m := range matches {
		if m.BracketPosition != nil && *m.BracketPosition == "winners" && m.LoserNextMatchID != nil {
			losersLinked++
		}
	}

	if losersLinked == 0 {
		t.Error("expected some winners bracket matches to have loser_next_match_id set")
	}

	t.Logf("Winners matches with loser_next_match_id: %d", losersLinked)
}

func TestGenerateDoubleElimination_TooFewEntries(t *testing.T) {
	tournamentID := uuid.New()
	entries := makeEntries(1)

	_, _, err := GenerateDoubleElimination(tournamentID, entries)
	if err == nil {
		t.Error("expected error for < 2 entries")
	}
}

func TestGenerateDoubleElimination_NotPowerOfTwo(t *testing.T) {
	tournamentID := uuid.New()
	entries := makeEntries(3)

	_, _, err := GenerateDoubleElimination(tournamentID, entries)
	if err == nil {
		t.Error("expected error for non-power-of-2 entries")
	}
}
