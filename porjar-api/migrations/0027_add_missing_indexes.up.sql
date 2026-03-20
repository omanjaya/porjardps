-- Add missing database indexes for query performance

-- team_members: lookup by team, unique constraint on team+user
CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_members_team_user ON team_members(team_id, user_id);

-- br_lobby_results: already have idx_br_lobby_results_lobby and idx_br_lobby_results_team from 0011
-- re-create with IF NOT EXISTS for safety
CREATE INDEX IF NOT EXISTS idx_br_lobby_results_lobby ON br_lobby_results(lobby_id);
CREATE INDEX IF NOT EXISTS idx_br_lobby_results_team ON br_lobby_results(team_id);

-- tournaments: filter by game or status
CREATE INDEX IF NOT EXISTS idx_tournaments_game ON tournaments(game_id);
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status);

-- schedules: partial indexes for nullable FK columns
CREATE INDEX IF NOT EXISTS idx_schedules_bracket_match ON schedules(bracket_match_id) WHERE bracket_match_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_schedules_br_lobby ON schedules(br_lobby_id) WHERE br_lobby_id IS NOT NULL;

-- bracket_matches: partial indexes for nullable team columns
CREATE INDEX IF NOT EXISTS idx_bracket_matches_team_a ON bracket_matches(team_a_id) WHERE team_a_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bracket_matches_team_b ON bracket_matches(team_b_id) WHERE team_b_id IS NOT NULL;
