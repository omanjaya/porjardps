CREATE TABLE br_lobbies (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id  UUID REFERENCES tournaments(id) ON DELETE CASCADE,
    lobby_name     VARCHAR(100) NOT NULL,
    lobby_number   INT NOT NULL,
    day_number     INT DEFAULT 1,
    room_id        VARCHAR(100),
    room_password  VARCHAR(100),
    status         VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'live', 'completed')),
    scheduled_at   TIMESTAMPTZ,
    started_at     TIMESTAMPTZ,
    completed_at   TIMESTAMPTZ,
    created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_br_lobbies_tournament ON br_lobbies(tournament_id);
