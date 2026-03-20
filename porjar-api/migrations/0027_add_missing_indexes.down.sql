-- Rollback: drop indexes added in 0027
-- Note: br_lobby_results indexes already existed in 0011, so we do NOT drop them here

DROP INDEX IF EXISTS idx_team_members_team;
DROP INDEX IF EXISTS idx_team_members_team_user;

DROP INDEX IF EXISTS idx_tournaments_game;
DROP INDEX IF EXISTS idx_tournaments_status;

DROP INDEX IF EXISTS idx_schedules_bracket_match;
DROP INDEX IF EXISTS idx_schedules_br_lobby;

DROP INDEX IF EXISTS idx_bracket_matches_team_a;
DROP INDEX IF EXISTS idx_bracket_matches_team_b;
