CREATE TABLE match_checkins (
  id BIGSERIAL PRIMARY KEY,
  match_id UUID NOT NULL,
  match_type VARCHAR(20) NOT NULL CHECK (match_type IN ('bracket', 'group', 'br_lobby')),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  team_side VARCHAR(2) NOT NULL CHECK (team_side IN ('a', 'b')),
  checked_in_by UUID REFERENCES users(id) ON DELETE SET NULL,
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(match_id, team_side, match_type)
);
CREATE INDEX idx_match_checkins_match ON match_checkins(match_id, match_type);
