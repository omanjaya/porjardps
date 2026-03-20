-- Add composite indexes for common query patterns
-- Note: CONCURRENTLY removed — migration tool runs in a transaction block

CREATE INDEX IF NOT EXISTS idx_bracket_matches_tournament_status
    ON bracket_matches(tournament_id, status);

CREATE INDEX IF NOT EXISTS idx_bracket_matches_status ON bracket_matches(status);

CREATE INDEX IF NOT EXISTS idx_br_lobbies_tournament_status
    ON br_lobbies(tournament_id, status);

CREATE INDEX IF NOT EXISTS idx_br_lobbies_status ON br_lobbies(status);

CREATE INDEX IF NOT EXISTS idx_tournament_teams_tournament_status
    ON tournament_teams(tournament_id, status);
