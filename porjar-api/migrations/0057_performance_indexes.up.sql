-- Match submissions: composite indexes for status filter queries
CREATE INDEX IF NOT EXISTS idx_match_submissions_bracket_status ON match_submissions(bracket_match_id, status);
CREATE INDEX IF NOT EXISTS idx_match_submissions_lobby_status ON match_submissions(br_lobby_id, status);
CREATE INDEX IF NOT EXISTS idx_match_submissions_team_status ON match_submissions(team_id, status);

-- Standings: tiebreaker column indexes for ORDER BY performance
CREATE INDEX IF NOT EXISTS idx_standings_wwcd ON standings(tournament_id, wwcd_count DESC);
CREATE INDEX IF NOT EXISTS idx_standings_placement ON standings(tournament_id, total_placement_points DESC);
CREATE INDEX IF NOT EXISTS idx_standings_kills ON standings(tournament_id, total_kills DESC);

-- BR lobby results: lobby + map number composite
CREATE INDEX IF NOT EXISTS idx_br_lobby_results_lobby_map ON br_lobby_results(lobby_id, map_number);
