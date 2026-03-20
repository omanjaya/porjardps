CREATE TABLE schedules (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id    UUID REFERENCES tournaments(id),
    bracket_match_id UUID REFERENCES bracket_matches(id),
    br_lobby_id      UUID REFERENCES br_lobbies(id),
    title            VARCHAR(255) NOT NULL,
    description      TEXT,
    venue            VARCHAR(255),
    scheduled_at     TIMESTAMPTZ NOT NULL,
    end_at           TIMESTAMPTZ,
    status           VARCHAR(20) DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'ongoing', 'completed', 'postponed', 'cancelled')),
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_schedules_date ON schedules(scheduled_at);
CREATE INDEX idx_schedules_tournament ON schedules(tournament_id);
CREATE INDEX idx_schedules_status ON schedules(status);
