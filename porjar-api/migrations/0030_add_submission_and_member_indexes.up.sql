-- Composite index for match_submissions queries (bracket_match_id + team filtering)
CREATE INDEX IF NOT EXISTS idx_match_submissions_bracket_team
    ON match_submissions(bracket_match_id, team_id);

-- Index on team_members(user_id) for GetMyTeamsEnriched lookup
CREATE INDEX IF NOT EXISTS idx_team_members_user
    ON team_members(user_id);

-- Partial index for unread notifications count query
CREATE INDEX IF NOT EXISTS idx_notifications_unread
    ON notifications(user_id) WHERE is_read = false;
