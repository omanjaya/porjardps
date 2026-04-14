CREATE TABLE events (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug                VARCHAR(100) UNIQUE NOT NULL,
    name                VARCHAR(255) NOT NULL,
    short_name          VARCHAR(50) NOT NULL,
    description         TEXT,
    logo_url            TEXT,
    banner_url          TEXT,
    primary_color       VARCHAR(7) DEFAULT '#C41E2A',
    secondary_color     VARCHAR(7),
    venue               VARCHAR(255),
    city                VARCHAR(100),
    organizer           VARCHAR(255),
    start_date          TIMESTAMPTZ,
    end_date            TIMESTAMPTZ,
    registration_start  TIMESTAMPTZ,
    registration_end    TIMESTAMPTZ,
    status              VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'ongoing', 'completed', 'archived')),
    contact_phone       VARCHAR(50),
    contact_email       VARCHAR(255),
    instagram_url       TEXT,
    website_url         TEXT,
    announcement        TEXT,
    announcement_active BOOLEAN DEFAULT false,
    registration_open   BOOLEAN DEFAULT false,
    rules_published     BOOLEAN DEFAULT false,
    sort_order          INT DEFAULT 0,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_slug ON events(slug);
CREATE INDEX idx_events_status ON events(status);
