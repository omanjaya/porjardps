-- Add index for activity log cleanup queries (support retention policy)
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_desc ON activity_logs(created_at DESC);

-- TODO: Add CHECK on match_submissions.screenshot_urls requiring at least 1 screenshot
-- for bracket submissions. Skipped: requires JSONB array length check conditional on
-- tournament format (BR submissions may not need screenshots). Handle in application layer.
