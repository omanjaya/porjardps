CREATE INDEX IF NOT EXISTS idx_match_submissions_status ON match_submissions(status);
CREATE INDEX IF NOT EXISTS idx_bracket_matches_status ON bracket_matches(status);
CREATE INDEX IF NOT EXISTS idx_teams_status ON teams(status);
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status);
CREATE INDEX IF NOT EXISTS idx_match_checkins_team ON match_checkins(team_id);
