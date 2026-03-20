CREATE TABLE schools (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       VARCHAR(255) NOT NULL,
    level      VARCHAR(10) NOT NULL CHECK (level IN ('SMP', 'SMA', 'SMK')),
    address    TEXT,
    city       VARCHAR(100) DEFAULT 'Denpasar',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
