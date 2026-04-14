ALTER TABLE tournaments ADD COLUMN event_id UUID REFERENCES events(id);
CREATE INDEX idx_tournaments_event_id ON tournaments(event_id);
