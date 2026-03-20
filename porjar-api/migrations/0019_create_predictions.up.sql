CREATE TABLE match_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bracket_match_id UUID REFERENCES bracket_matches(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    predicted_winner_id UUID REFERENCES teams(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(bracket_match_id, user_id)
);
CREATE INDEX idx_predictions_match ON match_predictions(bracket_match_id);
CREATE INDEX idx_predictions_user ON match_predictions(user_id);
