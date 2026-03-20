-- Prevent duplicate pending submissions at DB level
CREATE UNIQUE INDEX IF NOT EXISTS uniq_pending_bracket_submission
    ON match_submissions(bracket_match_id, team_id)
    WHERE status = 'pending' AND bracket_match_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_pending_br_submission
    ON match_submissions(br_lobby_id, team_id)
    WHERE status = 'pending' AND br_lobby_id IS NOT NULL;
