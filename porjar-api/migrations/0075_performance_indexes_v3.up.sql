-- Events: list query orders by (sort_order, created_at DESC) but only has idx_events_status
CREATE INDEX IF NOT EXISTS idx_events_sort_order ON events(sort_order, created_at DESC);

-- Tournaments: list queries order by created_at DESC; add covering index for common list path
CREATE INDEX IF NOT EXISTS idx_tournaments_created ON tournaments(created_at DESC);

-- Group matches: queried by team_a_id / team_b_id when building player dashboards
CREATE INDEX IF NOT EXISTS idx_group_matches_team_a ON group_matches(team_a_id) WHERE team_a_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_group_matches_team_b ON group_matches(team_b_id) WHERE team_b_id IS NOT NULL;

-- Match cards: queried by bracket_match_id OR br_lobby_id OR group_match_id in referee card lookups
CREATE INDEX IF NOT EXISTS idx_match_cards_bracket_match ON match_cards(bracket_match_id) WHERE bracket_match_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_match_cards_br_lobby ON match_cards(br_lobby_id) WHERE br_lobby_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_match_cards_group_match ON match_cards(group_match_id) WHERE group_match_id IS NOT NULL;

-- Referee assignments: checked with (bracket_match_id OR br_lobby_id OR group_match_id) filter
CREATE INDEX IF NOT EXISTS idx_referee_assignments_bracket ON referee_assignments(bracket_match_id) WHERE bracket_match_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_referee_assignments_lobby ON referee_assignments(br_lobby_id) WHERE br_lobby_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_referee_assignments_group ON referee_assignments(group_match_id) WHERE group_match_id IS NOT NULL;
