-- Configurable point rules per event (e.g. rank 1 = 100pt, rank 2 = 75pt)
CREATE TABLE event_point_rules (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id      UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    rank_position INT NOT NULL,
    points        INT NOT NULL DEFAULT 0,
    UNIQUE(event_id, rank_position)
);
CREATE INDEX idx_event_point_rules_event ON event_point_rules(event_id);

-- Event-level team registration
CREATE TABLE event_registrations (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id      UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    team_id       UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    registered_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, team_id)
);
CREATE INDEX idx_event_registrations_event ON event_registrations(event_id);
CREATE INDEX idx_event_registrations_team ON event_registrations(team_id);

-- Points awarded to a team for a specific tournament within an event
CREATE TABLE event_team_points (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id      UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    team_id       UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    rank_position INT NOT NULL,
    points        INT NOT NULL DEFAULT 0,
    awarded_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, tournament_id, team_id)
);
CREATE INDEX idx_event_team_points_event ON event_team_points(event_id);
CREATE INDEX idx_event_team_points_team ON event_team_points(team_id);
CREATE INDEX idx_event_team_points_tournament ON event_team_points(tournament_id);

-- Points awarded to individual users from their team's performance
CREATE TABLE event_user_points (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id      UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    team_id       UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    rank_position INT NOT NULL,
    points        INT NOT NULL DEFAULT 0,
    awarded_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, tournament_id, user_id)
);
CREATE INDEX idx_event_user_points_event ON event_user_points(event_id);
CREATE INDEX idx_event_user_points_user ON event_user_points(user_id);
CREATE INDEX idx_event_user_points_team ON event_user_points(team_id);

-- Add requires_school flag to events
ALTER TABLE events ADD COLUMN requires_school BOOLEAN DEFAULT false;
