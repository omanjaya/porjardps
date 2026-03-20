-- Rollback: drop composite indexes added in 0028

DROP INDEX IF EXISTS idx_bracket_matches_tournament_status;
DROP INDEX IF EXISTS idx_br_lobbies_tournament_status;
DROP INDEX IF EXISTS idx_br_lobbies_status;
DROP INDEX IF EXISTS idx_tournament_teams_tournament_status;
