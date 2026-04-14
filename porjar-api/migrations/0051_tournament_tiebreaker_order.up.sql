ALTER TABLE tournaments
    ADD COLUMN IF NOT EXISTS tiebreaker_order TEXT[] NOT NULL DEFAULT '{wwcd,placement_points,kills,best_placement}';
