-- Add per-player kill columns for Battle Royale submissions.
-- Captain inputs each player's kills separately; the total is auto-summed into claimed_kills.
ALTER TABLE match_submissions
    ADD COLUMN kills_p1 SMALLINT NOT NULL DEFAULT 0,
    ADD COLUMN kills_p2 SMALLINT NOT NULL DEFAULT 0,
    ADD COLUMN kills_p3 SMALLINT NOT NULL DEFAULT 0,
    ADD COLUMN kills_p4 SMALLINT NOT NULL DEFAULT 0;
