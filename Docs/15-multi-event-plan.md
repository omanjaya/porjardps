# Multi-Event Platform Plan

## Status: DRAFT — Belum diimplementasi

---

## 1. Latar Belakang

Saat ini platform hardcoded sebagai "PORJAR Denpasar" — satu event, satu set tournament. Rencana ke depan: platform menjadi `esidenpasar.id` yang bisa menampung banyak event/kompetisi, masing-masing dengan branding, tournament, dan landing page sendiri.

Contoh event:
- PORJAR Denpasar 2026
- PORJAR Badung 2027
- Esport Championship Bali 2027
- Liga Pelajar Denpasar Season 2

---

## 2. Arsitektur Target

### URL Structure

```
esidenpasar.id                              → Landing utama (list event)
esidenpasar.id/:event-slug                  → Landing page event (branding khusus)
esidenpasar.id/:event-slug/tournaments      → List tournament di event
esidenpasar.id/:event-slug/tournaments/:id  → Detail tournament
esidenpasar.id/:event-slug/standings        → Standings event
esidenpasar.id/:event-slug/schedule         → Jadwal event

esidenpasar.id/dashboard                    → Dashboard player (semua event)
esidenpasar.id/admin                        → Admin panel
```

### Entity Hierarchy

```
Platform (esidenpasar.id)
  └── Events (PORJAR 2026, Liga Pelajar 2027, ...)
        └── Tournaments (ML SMA, EFO Solo, FF SMP, ...)
              ├── Teams (registered per tournament)
              ├── Bracket Matches
              ├── BR Lobbies
              └── Schedules

Users ──── global (bisa ikut banyak event)
Teams ──── global (bisa didaftarkan ke banyak tournament/event)
Schools ── global (data sekolah shared)
Games ──── global (ML, HOK, FF, EFO, ...)
```

---

## 3. Database Changes

### Tabel Baru: `events`

```sql
CREATE TABLE events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(200) NOT NULL,
    slug            VARCHAR(100) NOT NULL UNIQUE,
    description     TEXT,
    logo_url        VARCHAR(500),
    banner_url      VARCHAR(500),
    -- Branding
    primary_color   VARCHAR(7),          -- hex color, e.g. "#C41E2A"
    secondary_color VARCHAR(7),
    -- Dates
    start_date      TIMESTAMPTZ,
    end_date        TIMESTAMPTZ,
    registration_start TIMESTAMPTZ,
    registration_end   TIMESTAMPTZ,
    -- Status
    status          VARCHAR(20) NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'published', 'ongoing', 'completed', 'archived')),
    -- Settings
    settings        JSONB DEFAULT '{}',  -- custom per-event config
    -- Timestamps
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_events_slug ON events(slug);
CREATE INDEX idx_events_status ON events(status);
```

### Perubahan: `tournaments`

```sql
ALTER TABLE tournaments ADD COLUMN event_id UUID REFERENCES events(id);
CREATE INDEX idx_tournaments_event ON tournaments(event_id);
```

### Opsional: `event_admins` (jika butuh admin per-event)

```sql
CREATE TABLE event_admins (
    id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role     VARCHAR(20) NOT NULL DEFAULT 'admin'
             CHECK (role IN ('admin', 'organizer', 'referee')),
    UNIQUE(event_id, user_id)
);
```

---

## 4. API Changes

### Endpoint Baru

```
# Public
GET    /events                          → List published events
GET    /events/:slug                    → Event detail + stats
GET    /events/:slug/tournaments        → Tournaments in event

# Admin
POST   /admin/events                    → Create event
PUT    /admin/events/:id                → Update event
DELETE /admin/events/:id                → Delete event (draft only)
PUT    /admin/events/:id/status         → Publish/archive
POST   /admin/events/:id/tournaments    → Create tournament in event
```

### Perubahan Existing

```
GET /tournaments            → tambah query param ?event_id=xxx atau ?event_slug=xxx
GET /tournaments/:id        → tetap (ID globally unique)
GET /admin/tournaments      → filter by event_id
POST /admin/tournaments     → wajib kirim event_id
```

### Backward Compatibility

- Endpoint lama tetap jalan (tournament tanpa event_id = legacy/global)
- Migration: assign semua tournament existing ke event "PORJAR Denpasar 2026"
- Frontend detect: kalau URL lama (`/tournaments/:id`), redirect ke `/event-slug/tournaments/:id`

---

## 5. Frontend Changes

### Pages Baru

```
src/app/
  ├── page.tsx                          → Landing: list events (card grid)
  ├── [eventSlug]/
  │   ├── page.tsx                      → Event landing page (hero, stats, games)
  │   ├── tournaments/
  │   │   ├── page.tsx                  → Tournament list (filtered by event)
  │   │   └── [id]/
  │   │       ├── page.tsx              → Tournament detail (existing, moved)
  │   │       └── bracket/page.tsx      → Bracket view (existing, moved)
  │   ├── standings/page.tsx            → Event standings
  │   └── schedule/page.tsx             → Event schedule
  └── admin/
      └── events/
          ├── page.tsx                  → Event management list
          ├── new/page.tsx              → Create event form
          └── [id]/page.tsx             → Edit event
```

### Component Changes

| Component | Perubahan |
|-----------|-----------|
| `Navbar` | Tambah event selector/breadcrumb |
| `AdminLayout` | Tambah event context |
| `PageHeader` | Tampilkan event name + logo |
| `TournamentCard` | Tidak berubah |
| Landing page | Baru: event cards grid |
| Event landing | Baru: hero banner, stats, game list |

### Event Landing Page Design

```
┌─────────────────────────────────────────────┐
│ [Hero Banner - full width]                  │
│  Logo + "PORJAR DENPASAR 2026"              │
│  "Pekan Olahraga Pelajar Esport"            │
│  [Tanggal] [Status Badge]                   │
├─────────────────────────────────────────────┤
│ Stats Cards:                                │
│ [132 Sekolah] [500+ Peserta] [18 Tournament]│
├─────────────────────────────────────────────┤
│ Game Cards (grid):                          │
│ [ML Pria] [ML Wanita] [HOK] [EFO] [FF]     │
│  → click → filtered tournament list         │
├─────────────────────────────────────────────┤
│ Live Matches (kalau ada)                    │
│ Recent Results                              │
└─────────────────────────────────────────────┘
```

---

## 6. Data Migration

### Step 1: Create events table + migration

```sql
-- Migration: 0036_create_events.sql
CREATE TABLE events (...);
```

### Step 2: Create default event + assign existing tournaments

```sql
-- Migration: 0037_migrate_to_events.sql

-- Create the PORJAR 2026 event
INSERT INTO events (id, name, slug, status, start_date, end_date)
VALUES (
    gen_random_uuid(),
    'PORJAR Denpasar 2026',
    'porjar-2026',
    'ongoing',
    '2026-03-01',
    '2026-04-30'
);

-- Link all existing tournaments to this event
UPDATE tournaments SET event_id = (SELECT id FROM events WHERE slug = 'porjar-2026');

-- Make event_id NOT NULL after migration
ALTER TABLE tournaments ALTER COLUMN event_id SET NOT NULL;
```

### Step 3: Redirect rules

```nginx
# Old URLs redirect to new structure
location ~ ^/tournaments/(.+) {
    return 301 /porjar-2026/tournaments/$1;
}
```

---

## 7. Scope per Entity

| Entity | Scope | Alasan |
|--------|-------|--------|
| Events | Global | Top-level container |
| Tournaments | Per-event | Setiap event punya tournament sendiri |
| Teams | Global | Tim yang sama bisa ikut banyak event |
| Users | Global | Player daftar sekali, ikut banyak event |
| Schools | Global | Data sekolah shared |
| Games | Global | ML, HOK, FF sama di semua event |
| Schedules | Per-tournament (per-event) | Jadwal per tournament |
| Bracket Matches | Per-tournament (per-event) | Bracket per tournament |
| Standings | Per-tournament (per-event) | Ranking per tournament |
| Submissions | Per-match (per-tournament) | Submit per match |

---

## 8. Pertimbangan Admin

### Opsi A: Admin Global (Recommended untuk sekarang)

- Semua admin bisa kelola semua event
- Paling simple, tidak perlu perubahan auth
- Cocok kalau organizer = satu tim yang sama

### Opsi B: Admin per-Event (Masa depan)

- Tabel `event_admins` menentukan siapa bisa kelola event apa
- Superadmin bisa akses semua
- Butuh: middleware scope check, UI event selector
- Implement nanti kalau ada kebutuhan multi-organizer

---

## 9. EventSettings Migration

`event_settings` yang sekarang (global) dipindah ke `events.settings` (JSONB per-event):

```json
{
  "brand_name": "PORJAR Denpasar",
  "tagline": "Pekan Olahraga Pelajar Esport",
  "primary_color": "#C41E2A",
  "footer_text": "Dinas Pendidikan Kota Denpasar",
  "social_links": {
    "instagram": "...",
    "whatsapp": "..."
  }
}
```

---

## 10. Timeline Estimasi

| Phase | Durasi | Deliverable |
|-------|--------|-------------|
| **Phase 1: Foundation** | 1-2 hari | DB migration, events CRUD API, admin event management page |
| **Phase 2: Tournament Scoping** | 1 hari | Link tournaments to events, filter API, update admin |
| **Phase 3: Public Pages** | 1-2 hari | Event landing page, event list, URL routing |
| **Phase 4: Migration** | 0.5 hari | Assign existing data ke event PORJAR 2026, nginx redirects |
| **Phase 5: Polish** | 1 hari | Branding per event, event selector navbar, testing |
| **Total** | ~5 hari | |

---

## 11. Risiko & Mitigasi

| Risiko | Mitigasi |
|--------|----------|
| URL lama rusak (SEO, shared links) | Nginx redirect rules + tetap support legacy URL |
| Performance (extra JOIN per query) | Index on `event_id`, cache event data di Redis |
| Kompleksitas admin | Phase 1 tetap admin global, scoped admin nanti |
| Data PORJAR 2026 terganggu | Migration idempotent, backup DB sebelum deploy |
| E2E tests break | Update test fixtures setelah migration |

---

## 12. Keputusan yang Perlu Diambil Sebelum Mulai

- [ ] Domain: tetap `porjar.esidenpasar.com` atau pindah ke `esidenpasar.id`?
- [ ] Admin: global atau per-event?
- [ ] Timing: mulai sekarang atau setelah PORJAR 2026 selesai?
- [ ] Tim & sekolah: tetap global atau bisa per-event?
- [ ] Challonge: setiap event punya API key sendiri atau shared?
