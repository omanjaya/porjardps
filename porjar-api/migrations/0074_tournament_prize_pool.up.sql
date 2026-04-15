ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS prize_pool TEXT,
  ADD COLUMN IF NOT EXISTS prize_description TEXT;
