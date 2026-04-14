ALTER TABLE match_submissions
    DROP COLUMN IF EXISTS kills_p1,
    DROP COLUMN IF EXISTS kills_p2,
    DROP COLUMN IF EXISTS kills_p3,
    DROP COLUMN IF EXISTS kills_p4;
