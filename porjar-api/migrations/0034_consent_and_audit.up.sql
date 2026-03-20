-- User consent tracking (UU PDP Pasal 7)
CREATE TABLE IF NOT EXISTS user_consents (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    consent_type VARCHAR(50) NOT NULL, -- 'personal_data', 'cookies', 'terms'
    version     VARCHAR(20) NOT NULL DEFAULT '1.0',
    given_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address  INET,
    user_agent  TEXT,
    UNIQUE(user_id, consent_type, version)
);

-- Audit log for sensitive data access (UU PDP Pasal 10)
CREATE TABLE IF NOT EXISTS audit_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    action      VARCHAR(100) NOT NULL, -- 'VIEW_PROFILE', 'UPDATE_PROFILE', 'LOGIN', 'REGISTER', etc.
    entity_type VARCHAR(50),           -- 'user', 'player', 'team', etc.
    entity_id   UUID,
    ip_address  INET,
    user_agent  TEXT,
    metadata    JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_user_consents_user_id ON user_consents(user_id);
