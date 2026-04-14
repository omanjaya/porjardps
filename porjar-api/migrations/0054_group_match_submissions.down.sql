DROP INDEX IF EXISTS idx_match_submissions_group_match;
ALTER TABLE match_submissions DROP COLUMN IF EXISTS group_match_id;
