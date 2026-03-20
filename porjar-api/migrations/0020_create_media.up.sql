CREATE TABLE media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uploaded_by UUID REFERENCES users(id),
    entity_type VARCHAR(30) NOT NULL CHECK (entity_type IN ('match', 'tournament', 'team', 'lobby', 'general')),
    entity_id UUID,
    file_url TEXT NOT NULL,
    thumbnail_url TEXT,
    file_type VARCHAR(20) NOT NULL CHECK (file_type IN ('image', 'video_link')),
    title VARCHAR(255),
    description TEXT,
    is_highlight BOOLEAN DEFAULT false,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_media_entity ON media(entity_type, entity_id);
CREATE INDEX idx_media_highlights ON media(is_highlight, created_at DESC);
