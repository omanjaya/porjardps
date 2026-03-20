CREATE TABLE br_point_rules (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
    placement     INT NOT NULL,
    points        INT NOT NULL,
    UNIQUE(tournament_id, placement)
);
