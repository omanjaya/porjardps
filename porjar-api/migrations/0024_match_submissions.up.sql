-- Add coach role
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('player', 'coach', 'admin', 'superadmin'));

-- Match result submissions (peserta upload bukti)
CREATE TABLE match_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bracket_match_id UUID REFERENCES bracket_matches(id) ON DELETE CASCADE,
    br_lobby_id UUID REFERENCES br_lobbies(id) ON DELETE CASCADE,
    submitted_by UUID REFERENCES users(id) NOT NULL,
    team_id UUID REFERENCES teams(id) NOT NULL,

    -- Claimed result
    claimed_winner_id UUID REFERENCES teams(id),
    claimed_score_a INT,
    claimed_score_b INT,

    -- BR specific
    claimed_placement INT,
    claimed_kills INT,

    -- Evidence screenshots (multiple)
    screenshot_urls TEXT[] NOT NULL DEFAULT '{}',

    -- Verification
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'disputed')),
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMPTZ,
    rejection_reason TEXT,
    admin_notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_match_submissions_bracket ON match_submissions(bracket_match_id);
CREATE INDEX idx_match_submissions_lobby ON match_submissions(br_lobby_id);
CREATE INDEX idx_match_submissions_team ON match_submissions(team_id);
CREATE INDEX idx_match_submissions_status ON match_submissions(status);

-- Coach-school relationship
CREATE TABLE coach_schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, school_id)
);
CREATE INDEX idx_coach_schools_user ON coach_schools(user_id);
