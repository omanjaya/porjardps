package bracket

import (
	"testing"

	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
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

	// Losers bracket for 8 teams (WR final loser drops into LB Final):
	// LR1 major: 4 WR1 losers paired → 2 matches
	// LR2 major: 2 WR2 losers vs 2 LR1 winners → 2 matches
	// LR3 minor: 2 LR2 winners → 1 match
	// LR4 (LB Final): WR3 loser vs LR3 winner → 1 match
	// Total losers = 2+2+1+1 = 6
	// Grand Final: WR3 winner vs LR4 winner → 1 match
	// Grand total: 7 + 6 + 1 = 14  (formula: 2n-2 = 2*8-2 = 14)
	if losersCount != 6 {
		t.Errorf("expected 6 losers matches for 8 teams, got %d", losersCount)
	}

	if len(matches) != 14 {
		t.Errorf("expected 14 total matches for 8 teams (2n-2), got %d", len(matches))
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
	// 4 teams: WR=3, LR=2, GF=1, Total=6 (2*4-2=6)
	// LR1: 2 WR1 losers → 1 match
	// LR Final: WR Final loser vs LR1 winner → 1 match
	matches, _, err := GenerateDoubleElimination(uuid.New(), makeEntries(4))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	wCount, lCount, gfCount := countByPosition(matches)
	if wCount != 3 {
		t.Errorf("4 teams: expected 3 winners matches, got %d", wCount)
	}
	if lCount != 2 {
		t.Errorf("4 teams: expected 2 losers matches, got %d", lCount)
	}
	if gfCount != 1 {
		t.Errorf("4 teams: expected 1 grand final, got %d", gfCount)
	}
	if len(matches) != 6 {
		t.Errorf("4 teams: expected 6 total matches (2n-2), got %d", len(matches))
	}
}

func TestGenerateDoubleElimination_16Teams(t *testing.T) {
	// 16 teams: WR=15, LR=14, GF=1, Total=30 (2*16-2=30)
	// LR1: 8 WR1 losers → 4 matches
	// LR2: 4 WR2 losers vs 4 LR1 winners → 4 matches
	// LR3 minor: 4 LR2 winners → 2 matches
	// LR4: 2 WR3 losers vs 2 LR3 winners → 2 matches
	// LR5 minor: 2 LR4 winners → 1 match
	// LR Final: WR Final loser vs LR5 winner → 1 match
	matches, _, err := GenerateDoubleElimination(uuid.New(), makeEntries(16))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	wCount, lCount, gfCount := countByPosition(matches)
	if wCount != 15 {
		t.Errorf("16 teams: expected 15 winners matches, got %d", wCount)
	}
	if lCount != 14 {
		t.Errorf("16 teams: expected 14 losers matches, got %d", lCount)
	}
	if gfCount != 1 {
		t.Errorf("16 teams: expected 1 grand final, got %d", gfCount)
	}
	if len(matches) != 30 {
		t.Errorf("16 teams: expected 30 total matches (2n-2), got %d", len(matches))
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
