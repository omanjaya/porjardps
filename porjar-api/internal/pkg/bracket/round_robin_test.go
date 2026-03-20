package bracket

import (
	"testing"

	"github.com/google/uuid"
)

func TestGenerateRoundRobin_4Teams(t *testing.T) {
	tournamentID := uuid.New()
	entries := makeEntries(4)

	matches, rounds, err := GenerateRoundRobin(tournamentID, entries)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// 4 teams: n*(n-1)/2 = 6 matches
	if len(matches) != 6 {
		t.Errorf("expected 6 matches for 4 teams, got %d", len(matches))
	}

	// 4 teams (even): n-1 = 3 rounds
	if rounds != 3 {
		t.Errorf("expected 3 rounds for 4 teams, got %d", rounds)
	}

	// Verify all matches have both teams set
	for i, m := range matches {
		if m.TeamAID == nil || m.TeamBID == nil {
			t.Errorf("match %d has nil team", i)
		}
		if m.TournamentID != tournamentID {
			t.Error("tournament ID mismatch")
		}
		if m.Status != "pending" {
			t.Errorf("expected pending status, got %s", m.Status)
		}
	}

	// Verify every pair plays exactly once
	type pair struct{ a, b uuid.UUID }
	seen := make(map[pair]bool)
	for _, m := range matches {
		a, b := *m.TeamAID, *m.TeamBID
		if a.String() > b.String() {
			a, b = b, a
		}
		p := pair{a, b}
		if seen[p] {
			t.Errorf("duplicate pairing found")
		}
		seen[p] = true
	}

	if len(seen) != 6 {
		t.Errorf("expected 6 unique pairings, got %d", len(seen))
	}
}

func TestGenerateRoundRobin_6Teams(t *testing.T) {
	tournamentID := uuid.New()
	entries := makeEntries(6)

	matches, rounds, err := GenerateRoundRobin(tournamentID, entries)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// 6 teams: n*(n-1)/2 = 15 matches
	if len(matches) != 15 {
		t.Errorf("expected 15 matches for 6 teams, got %d", len(matches))
	}

	// 6 teams (even): n-1 = 5 rounds
	if rounds != 5 {
		t.Errorf("expected 5 rounds for 6 teams, got %d", rounds)
	}

	// Verify every pair plays exactly once
	type pair struct{ a, b uuid.UUID }
	seen := make(map[pair]bool)
	for _, m := range matches {
		a, b := *m.TeamAID, *m.TeamBID
		if a.String() > b.String() {
			a, b = b, a
		}
		p := pair{a, b}
		if seen[p] {
			t.Errorf("duplicate pairing found")
		}
		seen[p] = true
	}

	if len(seen) != 15 {
		t.Errorf("expected 15 unique pairings, got %d", len(seen))
	}
}

func TestGenerateRoundRobin_OddTeams(t *testing.T) {
	tournamentID := uuid.New()
	entries := makeEntries(5)

	matches, rounds, err := GenerateRoundRobin(tournamentID, entries)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// 5 teams: n*(n-1)/2 = 10 matches
	if len(matches) != 10 {
		t.Errorf("expected 10 matches for 5 teams, got %d", len(matches))
	}

	// 5 teams (odd, padded to 6): 6-1 = 5 rounds
	if rounds != 5 {
		t.Errorf("expected 5 rounds for 5 teams, got %d", rounds)
	}
}

func TestGenerateRoundRobin_TooFewTeams(t *testing.T) {
	tournamentID := uuid.New()
	entries := makeEntries(1)

	_, _, err := GenerateRoundRobin(tournamentID, entries)
	if err == nil {
		t.Error("expected error for < 2 teams")
	}
}
