# Database Schema — PORJAR Denpasar Esport

## Overview

Single PostgreSQL database (`porjar`) serving the entire platform. UUIDs are used as primary keys throughout. The schema supports two distinct competition systems: bracket-based and battle royale point-based.

---

## Conventions

- All tables use `snake_case`
- Every table has `created_at` timestamp; mutable tables also have `updated_at`
- No soft deletes — tournament data is preserved, not deleted
- Foreign keys always reference `id` columns
- Enums defined as `VARCHAR` with `CHECK` constraints
- JSONB used for flexible data (hero bans, match metadata)

---

## Schema Diagram (simplified)

```
users ─── team_members ─── teams ─── tournament_teams ─── tournaments ─── games
              |                |                                |
              |              schools                           |
              |                                                |
              +── bracket_matches ── match_games               |
              |                                                |
              +── br_lobbies ── br_lobby_results               |
              |                    |                            |
              |               br_point_rules ──────────────────+
              |
              +── standings
              |
              +── schedules

activity_logs (audit trail)
```

---

## Tables

### users

Authentication and identity for all roles.

```sql
CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name     VARCHAR(255) NOT NULL,
    phone         VARCHAR(20),
    role          VARCHAR(20) DEFAULT 'player' CHECK (role IN ('player', 'admin', 'superadmin')),
    avatar_url    TEXT,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);
```

---

### schools

Schools participating in Porjar Denpasar.

```sql
CREATE TABLE schools (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       VARCHAR(255) NOT NULL,
    level      VARCHAR(10) NOT NULL CHECK (level IN ('SMP', 'SMA', 'SMK')),
    address    TEXT,
    city       VARCHAR(100) DEFAULT 'Denpasar',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### games

The 5 esport titles supported by the platform.

```sql
CREATE TABLE games (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name             VARCHAR(100) NOT NULL,
    slug             VARCHAR(50) UNIQUE NOT NULL,
    max_team_members INT NOT NULL,
    min_team_members INT NOT NULL,
    max_substitutes  INT DEFAULT 0,
    game_type        VARCHAR(20) NOT NULL CHECK (game_type IN ('bracket', 'battle_royale')),
    icon_url         TEXT,
    rules_url        TEXT,
    is_active        BOOLEAN DEFAULT true,
    created_at       TIMESTAMPTZ DEFAULT NOW()
);
```

> `game_type` determines which competition system is used:
> - `bracket` = HOK, ML, eFootball (head-to-head elimination)
> - `battle_royale` = FF, PUBGM (lobby-based point system)

---

### teams

Teams registered for a specific game.

```sql
CREATE TABLE teams (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    school_id       UUID REFERENCES schools(id),
    game_id         UUID REFERENCES games(id) NOT NULL,
    captain_user_id UUID REFERENCES users(id),
    logo_url        TEXT,
    status          VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'eliminated', 'active')),
    seed            INT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(name, game_id)
);
```

> Team name must be unique within the same game. A school can have multiple teams for different games.

---

### team_members

Players belonging to a team. A user can be on multiple teams (one per game).

```sql
CREATE TABLE team_members (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id       UUID REFERENCES teams(id) ON DELETE CASCADE,
    user_id       UUID REFERENCES users(id),
    in_game_name  VARCHAR(255) NOT NULL,
    in_game_id    VARCHAR(255),
    role          VARCHAR(20) DEFAULT 'member' CHECK (role IN ('captain', 'member', 'substitute')),
    jersey_number INT,
    joined_at     TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);
```

---

### tournaments

A game can have multiple tournaments/stages (qualifier, group stage, playoff, etc.).

```sql
CREATE TABLE tournaments (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id            UUID REFERENCES games(id) NOT NULL,
    name               VARCHAR(255) NOT NULL,
    format             VARCHAR(30) NOT NULL CHECK (format IN (
        'single_elimination', 'double_elimination',
        'round_robin', 'swiss',
        'battle_royale_points',
        'group_stage_playoff'
    )),
    stage              VARCHAR(30) DEFAULT 'main' CHECK (stage IN ('qualifier', 'group_stage', 'playoff', 'main', 'grand_final')),
    best_of            INT DEFAULT 1,
    max_teams          INT,
    status             VARCHAR(20) DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'registration', 'ongoing', 'completed', 'cancelled')),
    registration_start TIMESTAMPTZ,
    registration_end   TIMESTAMPTZ,
    start_date         TIMESTAMPTZ,
    end_date           TIMESTAMPTZ,
    rules              TEXT,
    created_at         TIMESTAMPTZ DEFAULT NOW(),
    updated_at         TIMESTAMPTZ DEFAULT NOW()
);
```

> `format` is not hardcoded per game — admin can choose any supported format. However, `battle_royale_points` only makes sense for FF/PUBGM, and bracket formats only for HOK/ML/eFootball.

---

### tournament_teams

Many-to-many linking teams to tournaments.

```sql
CREATE TABLE tournament_teams (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
    team_id       UUID REFERENCES teams(id),
    group_name    VARCHAR(10),
    seed          INT,
    status        VARCHAR(20) DEFAULT 'active',
    UNIQUE(tournament_id, team_id)
);
```

> `group_name` is used for group stage format ('A', 'B', 'C', etc.).

---

### bracket_matches

Head-to-head matches in bracket/elimination format. Used by HOK, ML, eFootball.

```sql
CREATE TABLE bracket_matches (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id       UUID REFERENCES tournaments(id) ON DELETE CASCADE,
    round               INT NOT NULL,
    match_number        INT NOT NULL,
    bracket_position    VARCHAR(20),
    team_a_id           UUID REFERENCES teams(id),
    team_b_id           UUID REFERENCES teams(id),
    winner_id           UUID REFERENCES teams(id),
    loser_id            UUID REFERENCES teams(id),
    score_a             INT DEFAULT 0,
    score_b             INT DEFAULT 0,
    status              VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'live', 'completed', 'bye')),
    scheduled_at        TIMESTAMPTZ,
    started_at          TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ,
    next_match_id       UUID REFERENCES bracket_matches(id),
    loser_next_match_id UUID REFERENCES bracket_matches(id),
    stream_url          TEXT,
    notes               TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);
```

> `round` = 1 is first round, 2 is quarter-final, etc. `next_match_id` links to the match the winner advances to. `loser_next_match_id` is used in double elimination for the losers bracket. `bracket_position` = 'winners' or 'losers' for double elimination.

---

### match_games

Individual games within a BO3/BO5 series.

```sql
CREATE TABLE match_games (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bracket_match_id UUID REFERENCES bracket_matches(id) ON DELETE CASCADE,
    game_number      INT NOT NULL,
    winner_id        UUID REFERENCES teams(id),
    score_a          INT DEFAULT 0,
    score_b          INT DEFAULT 0,
    duration_minutes INT,
    mvp_user_id      UUID REFERENCES users(id),
    map_name         VARCHAR(100),
    hero_bans        JSONB,
    notes            TEXT,
    created_at       TIMESTAMPTZ DEFAULT NOW()
);
```

> `hero_bans` stores JSONB like `{"team_a": ["Hero1", "Hero2"], "team_b": ["Hero3", "Hero4"]}` for MOBA games.

---

### br_lobbies

Battle royale match lobbies. Used by FF, PUBGM.

```sql
CREATE TABLE br_lobbies (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id  UUID REFERENCES tournaments(id) ON DELETE CASCADE,
    lobby_name     VARCHAR(100) NOT NULL,
    lobby_number   INT NOT NULL,
    day_number     INT DEFAULT 1,
    room_id        VARCHAR(100),
    room_password  VARCHAR(100),
    status         VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'live', 'completed')),
    scheduled_at   TIMESTAMPTZ,
    started_at     TIMESTAMPTZ,
    completed_at   TIMESTAMPTZ,
    created_at     TIMESTAMPTZ DEFAULT NOW()
);
```

> `room_id` and `room_password` are shared to teams before the lobby starts. These are visible to registered teams only.

---

### br_lobby_results

Per-team results for a specific battle royale lobby.

```sql
CREATE TABLE br_lobby_results (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lobby_id         UUID REFERENCES br_lobbies(id) ON DELETE CASCADE,
    team_id          UUID REFERENCES teams(id),
    placement        INT NOT NULL,
    kills            INT DEFAULT 0,
    placement_points INT DEFAULT 0,
    kill_points      INT DEFAULT 0,
    total_points     INT DEFAULT 0,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(lobby_id, team_id)
);
```

> Points are calculated by the service layer using `br_point_rules` and stored denormalized here for fast leaderboard queries.

---

### br_point_rules

Point configuration per tournament. Defines how placements map to points.

```sql
CREATE TABLE br_point_rules (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
    placement     INT NOT NULL,
    points        INT NOT NULL,
    UNIQUE(tournament_id, placement)
);
```

Default point rules:

| Placement | Points (FF/PUBGM) |
|---|---|
| 1st | 15 |
| 2nd | 12 |
| 3rd | 10 |
| 4th | 8 |
| 5th | 6 |
| 6th | 4 |
| 7th | 2 |
| 8th+ | 1 |

Kill points: 1 point per kill (configurable in service layer).

---

### standings

Aggregated standings per team per tournament. Used for both bracket and BR.

```sql
CREATE TABLE standings (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id          UUID REFERENCES tournaments(id) ON DELETE CASCADE,
    team_id                UUID REFERENCES teams(id),
    group_name             VARCHAR(10),
    -- Bracket stats
    matches_played         INT DEFAULT 0,
    wins                   INT DEFAULT 0,
    losses                 INT DEFAULT 0,
    draws                  INT DEFAULT 0,
    rounds_won             INT DEFAULT 0,
    rounds_lost            INT DEFAULT 0,
    -- Battle royale stats
    total_points           INT DEFAULT 0,
    total_kills            INT DEFAULT 0,
    total_placement_points INT DEFAULT 0,
    best_placement         INT,
    avg_placement          DECIMAL(5,2),
    -- General
    rank_position          INT,
    is_eliminated          BOOLEAN DEFAULT false,
    updated_at             TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tournament_id, team_id)
);
```

> This table is denormalized for fast reads. Updated by the service layer after every match completion or lobby result input.

---

### schedules

Unified schedule for all match types.

```sql
CREATE TABLE schedules (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id    UUID REFERENCES tournaments(id),
    bracket_match_id UUID REFERENCES bracket_matches(id),
    br_lobby_id      UUID REFERENCES br_lobbies(id),
    title            VARCHAR(255) NOT NULL,
    description      TEXT,
    venue            VARCHAR(255),
    scheduled_at     TIMESTAMPTZ NOT NULL,
    end_at           TIMESTAMPTZ,
    status           VARCHAR(20) DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'ongoing', 'completed', 'postponed', 'cancelled')),
    created_at       TIMESTAMPTZ DEFAULT NOW()
);
```

> Either `bracket_match_id` or `br_lobby_id` is set (not both). `venue` can be "Online" or a physical location for offline events.

---

### activity_logs

Audit trail for admin actions.

```sql
CREATE TABLE activity_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES users(id),
    action      VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id   UUID,
    details     JSONB,
    ip_address  VARCHAR(45),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

> Append-only. No `updated_at`. Actions include: `TEAM_APPROVED`, `MATCH_SCORE_UPDATED`, `BRACKET_GENERATED`, `LOBBY_RESULTS_INPUT`, `TOURNAMENT_STATUS_CHANGED`, etc.

---

## Indexes

```sql
-- Teams
CREATE INDEX idx_teams_game ON teams(game_id);
CREATE INDEX idx_teams_school ON teams(school_id);
CREATE INDEX idx_teams_status ON teams(status);

-- Team Members
CREATE INDEX idx_team_members_user ON team_members(user_id);

-- Bracket Matches
CREATE INDEX idx_bracket_matches_tournament ON bracket_matches(tournament_id);
CREATE INDEX idx_bracket_matches_status ON bracket_matches(status);
CREATE INDEX idx_bracket_matches_scheduled ON bracket_matches(scheduled_at);

-- Battle Royale
CREATE INDEX idx_br_lobbies_tournament ON br_lobbies(tournament_id);
CREATE INDEX idx_br_lobby_results_team ON br_lobby_results(team_id);
CREATE INDEX idx_br_lobby_results_lobby ON br_lobby_results(lobby_id);

-- Standings
CREATE INDEX idx_standings_tournament ON standings(tournament_id);
CREATE INDEX idx_standings_rank ON standings(tournament_id, rank_position);

-- Schedules
CREATE INDEX idx_schedules_date ON schedules(scheduled_at);
CREATE INDEX idx_schedules_tournament ON schedules(tournament_id);
CREATE INDEX idx_schedules_status ON schedules(status);

-- Activity Logs
CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX idx_activity_logs_created ON activity_logs(created_at);

-- Tournament Teams
CREATE INDEX idx_tournament_teams_tournament ON tournament_teams(tournament_id);
CREATE INDEX idx_tournament_teams_team ON tournament_teams(team_id);
```

---

## Migration Strategy

Migrations are versioned SQL files run in sequence:

```
porjar-api/migrations/
├── 0001_create_users.sql
├── 0002_create_schools.sql
├── 0003_create_games.sql
├── 0004_create_teams.sql
├── 0005_create_team_members.sql
├── 0006_create_tournaments.sql
├── 0007_create_tournament_teams.sql
├── 0008_create_bracket_matches.sql
├── 0009_create_match_games.sql
├── 0010_create_br_lobbies.sql
├── 0011_create_br_lobby_results.sql
├── 0012_create_br_point_rules.sql
├── 0013_create_standings.sql
├── 0014_create_schedules.sql
└── 0015_create_activity_logs.sql
```

Tool: `golang-migrate` or `goose`

---

## Seed Data

### Games (5 records)

| Name | Slug | Type | Min | Max | Subs |
|---|---|---|---|---|---|
| Honor of Kings | hok | bracket | 5 | 5 | 1 |
| Mobile Legends: Bang Bang | ml | bracket | 5 | 5 | 1 |
| Free Fire | ff | battle_royale | 4 | 4 | 1 |
| PUBG Mobile | pubgm | battle_royale | 4 | 4 | 1 |
| eFootball | efootball | bracket | 1 | 1 | 0 |

### Schools (sample — full list added during deployment)

```
SMP Negeri 1-12 Denpasar
SMA Negeri 1-8 Denpasar
SMK Negeri 1-5 Denpasar
SMP Dwijendra, SMA Dwijendra
SMP Harapan, SMA Harapan
SMP Saraswati, SMA Saraswati
SMP Santo Yoseph, SMA Santo Yoseph
```

### Default BR Point Rules (per tournament)

```
Placement 1: 15 points
Placement 2: 12 points
Placement 3: 10 points
Placement 4: 8 points
Placement 5: 6 points
Placement 6: 4 points
Placement 7: 2 points
Placement 8+: 1 point
Kill: 1 point each
```
