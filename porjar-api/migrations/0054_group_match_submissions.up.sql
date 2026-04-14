ALTER TABLE match_submissions ADD COLUMN IF NOT EXISTS group_match_id UUID REFERENCES group_matches(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_match_submissions_group_match ON match_submissions(group_match_id);
