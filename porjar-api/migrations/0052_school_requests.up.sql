CREATE TABLE school_requests (
    id            UUID PRIMARY KEY,
    name          TEXT NOT NULL,
    level         TEXT NOT NULL,
    requested_by  UUID NOT NULL REFERENCES users(id),
    status        TEXT NOT NULL DEFAULT 'pending',
    reject_reason TEXT,
    school_id     UUID REFERENCES schools(id),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at   TIMESTAMPTZ
);

CREATE INDEX idx_school_requests_status ON school_requests(status);
CREATE INDEX idx_school_requests_requested_by ON school_requests(requested_by);
