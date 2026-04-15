ALTER TABLE tournaments
  DROP COLUMN IF EXISTS prize_pool,
  DROP COLUMN IF EXISTS prize_description;
