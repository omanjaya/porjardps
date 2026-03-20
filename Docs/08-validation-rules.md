# Validation Rules — PORJAR Denpasar Esport

## Principles

- Validation runs at two layers: handler (input format) and service (business rules)
- Handler validates: required fields, types, formats, lengths
- Service validates: business logic, uniqueness, relationships, state transitions
- Never trust client input — validate everything before touching the database

---

## Global Rules

| Field | Rule |
|---|---|
| UUID | Valid UUID v4 format |
| Date | ISO 8601 format: `YYYY-MM-DD` |
| DateTime | ISO 8601 format: `YYYY-MM-DDTHH:MM:SSZ` |
| Phone | 10-15 digits, may start with `+62` or `08` |
| Email | Valid email format, max 255 chars |
| String fields | Trimmed, no leading/trailing whitespace |
| File upload | Max 5MB, allowed types: jpeg, png, webp |

---

## Auth

| Field | Rule |
|---|---|
| email | Valid email format, max 255 chars, unique |
| password | Min 8 chars, at least 1 uppercase, 1 number |
| full_name | 3-255 chars |
| phone | Valid phone format (nullable) |
| refresh_token | Required, non-empty string |

---

## Teams

| Field | Rule |
|---|---|
| name | 3-255 chars, unique per game |
| game_id | Must exist, must be active |
| school_id | Must exist (nullable for independent teams) |
| logo_url | Valid URL (nullable) |
| status | Enum: `pending`, `approved`, `rejected`, `eliminated`, `active` |
| seed | Positive integer (nullable) |

**Business Rules:**
- Team name must be unique within the same game (`UNIQUE(name, game_id)`)
- Creator auto-becomes captain with `role = 'captain'`
- A user can only be captain of one team per game
- Team must be `approved` status before registering to a tournament
- Cannot delete a team that is registered in an active tournament

---

## Team Members

| Field | Rule |
|---|---|
| in_game_name | 2-255 chars, required |
| in_game_id | Max 255 chars (nullable) |
| role | Enum: `captain`, `member`, `substitute` |
| jersey_number | Positive integer (nullable) |

**Business Rules:**
- A user can only be on one team per game (`UNIQUE(team_id, user_id)` + service check per game)
- Team cannot exceed `max_team_members + max_substitutes` defined by the game
- Only one member can have `role = 'captain'` per team
- Cannot add members after team is registered in an ongoing tournament (captain can request admin exception)
- Substitutes count: cannot exceed `max_substitutes` defined by the game

---

## Tournaments

| Field | Rule |
|---|---|
| name | 3-255 chars |
| game_id | Must exist |
| format | Enum: `single_elimination`, `double_elimination`, `round_robin`, `swiss`, `battle_royale_points`, `group_stage_playoff` |
| stage | Enum: `qualifier`, `group_stage`, `playoff`, `main`, `grand_final` |
| best_of | Positive odd integer: 1, 3, or 5 |
| max_teams | Positive integer (nullable) |
| status | Enum: `upcoming`, `registration`, `ongoing`, `completed`, `cancelled` |
| registration_start | Valid datetime |
| registration_end | Valid datetime, must be > registration_start |
| start_date | Valid datetime, must be >= registration_end |
| end_date | Valid datetime, must be >= start_date |

**Business Rules:**
- `battle_royale_points` format only valid for games with `game_type = 'battle_royale'`
- Bracket formats only valid for games with `game_type = 'bracket'`
- Cannot generate bracket if status is not `ongoing`
- Cannot generate bracket if less than 2 approved teams registered
- Status transitions: `upcoming` -> `registration` -> `ongoing` -> `completed`. No skipping. `cancelled` can be set from any state.
- Cannot register a team after `registration_end`
- Cannot register more teams than `max_teams` (if set)

---

## Tournament Registration

**Business Rules:**
- Only the team captain can register the team
- Team must have `status = 'approved'`
- Team must meet minimum member count for the game
- Tournament must be in `registration` status
- Tournament registration period must be active (between `registration_start` and `registration_end`)
- A team cannot register to the same tournament twice
- A team cannot register to multiple tournaments of the same game simultaneously (admin exception possible)

---

## Bracket Matches

| Field | Rule |
|---|---|
| round | Positive integer |
| match_number | Positive integer |
| bracket_position | Enum: `winners`, `losers` (nullable for single elim) |
| score_a | Non-negative integer |
| score_b | Non-negative integer |
| status | Enum: `pending`, `scheduled`, `live`, `completed`, `bye` |

**Business Rules:**
- Only admin can update match status and scores
- Status transitions: `pending` -> `scheduled` -> `live` -> `completed`. `bye` is auto-set.
- Cannot set status to `live` if either team slot is empty
- Cannot complete match if no winner determined (score_a must != score_b for BO series)
- Winner must be the team with more game wins in BO series
- On completion: winner auto-advances to `next_match_id`
- On completion in double elim: loser advances to `loser_next_match_id`
- Cannot edit a completed match (admin can reset if needed)

---

## Match Games (BO Series)

| Field | Rule |
|---|---|
| game_number | Positive integer, 1 to best_of |
| winner_id | Must be team_a_id or team_b_id |
| score_a | Non-negative integer |
| score_b | Non-negative integer |
| duration_minutes | Positive integer (nullable) |
| hero_bans | Valid JSON (nullable) |

**Business Rules:**
- Cannot add more games than `best_of` allows
- Game number must be sequential (no gaps)
- Winner of game must have higher score in that game
- Series is decided when one team reaches `ceil(best_of / 2)` wins
- No more games should be added after series is decided

---

## Battle Royale Lobbies

| Field | Rule |
|---|---|
| lobby_name | 3-100 chars |
| lobby_number | Positive integer |
| day_number | Positive integer |
| room_id | Max 100 chars (nullable) |
| room_password | Max 100 chars (nullable) |
| status | Enum: `pending`, `scheduled`, `live`, `completed` |

**Business Rules:**
- Lobby number must be unique within a tournament + day combination
- Cannot input results for a lobby that is not `live` or `completed`
- Room ID and password are only visible to registered teams (not public)

---

## Battle Royale Results

| Field | Rule |
|---|---|
| placement | Positive integer, 1 to lobby_size |
| kills | Non-negative integer |
| team_id | Must be registered in the tournament |

**Business Rules:**
- Each team can only have one result per lobby (`UNIQUE(lobby_id, team_id)`)
- Placement must be unique within a lobby (no two teams with same placement)
- Points auto-calculated from `br_point_rules` table
- After results input: cumulative standings are recalculated across all lobbies
- Rank position determined by: `total_points DESC`, then `total_kills DESC`, then `best_placement ASC`

---

## Standings

**Business Rules (auto-calculated by service layer):**
- For bracket tournaments: updated after each match completion
- For BR tournaments: recalculated after each lobby result input
- `is_eliminated` set to `true` when team loses in single elimination
- `rank_position` auto-assigned based on sorting criteria per tournament type

---

## Schedules

| Field | Rule |
|---|---|
| title | 3-255 chars |
| venue | Max 255 chars |
| scheduled_at | Valid datetime, not in the past (warning only, not hard block) |
| end_at | Valid datetime, must be > scheduled_at (nullable) |
| status | Enum: `upcoming`, `ongoing`, `completed`, `postponed`, `cancelled` |

**Business Rules:**
- Either `bracket_match_id` or `br_lobby_id` can be set (not both, both nullable for general events)
- When linked to a match/lobby, status should stay in sync

---

## Schools

| Field | Rule |
|---|---|
| name | 3-255 chars |
| level | Enum: `SMP`, `SMA`, `SMK` |
| address | Max 500 chars (nullable) |
| city | Max 100 chars, default `Denpasar` |

**Business Rules:**
- Cannot delete a school that has teams registered
- School name + level should be unique (soft check, warn but allow)

---

## Users (Admin Management)

| Field | Rule |
|---|---|
| role | Enum: `player`, `admin`, `superadmin` |

**Business Rules:**
- Only superadmin can change user roles
- Cannot change own role
- Cannot demote the last superadmin
