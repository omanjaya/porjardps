#!/usr/bin/env python3
"""
setup_tournaments.py

Reads Challonge JSON exports, creates tournaments in Porjar DB,
fuzzy-matches participants to teams, registers tournament_teams,
and writes /tmp/bracket_seeds.json for the Go bracket generator.
"""

import json
import os
import re
import difflib
import uuid
from pathlib import Path

import psycopg2
import psycopg2.extras

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

DB_CONFIG = {
    "host": "172.24.0.2",
    "port": 5432,
    "dbname": "porjar",
    "user": "porjar",
    "password": "o12S1kJiScjmejzPcIoAgyg9MUq9SD6f",
}

CHALLONGE_DIR = Path("/home/oman/project/porjar/tmp_import/challonge")
OUTPUT_FILE = Path("/tmp/bracket_seeds.json")

# Slug → (game_slug_prefix, school_level, format, tournament_name)
# game_slug_prefix: matched against games.slug using LIKE prefix
SLUG_MAP = {
    "nabvj57m": ("ml-pria",        "SMA", "single_elimination", "PORJAR ML SMA LAKI-LAKI 2026"),
    "aabnxzpq": ("ml-pria",        "SMP", "single_elimination", "PORJAR ML SMP LAKI-LAKI 2026"),
    "28ypv34w": ("ml-pria",        "SD",  "single_elimination", "PORJAR ML SD 2026"),
    "ulbvn63d": ("ml-wanita",      "SMP", "single_elimination", "PORJAR ML SMP LADIES 2026"),
    "s53o6t4d": ("ml-wanita",      "SMA", "single_elimination", "PORJAR ML SMA LADIES 2026"),
    "w7nod5fd": ("efootball-solo", "SMA", "single_elimination", "PORJAR EFO SOLO SMA"),
    "xw3s592x": ("efootball-duo",  "SMA", "single_elimination", "PORJAR EFO DUO SMA"),
    "mnf0ez67": ("efootball-solo", "SMP", "single_elimination", "PORJAR EFO SOLO SMP"),
    "kngcsm8k": ("hok",            "SMP", "double_elimination", "HOK SMP PORJAR"),
    "goxkqyxg": ("hok",            "SMA", "double_elimination", "HOK SMA PORJAR"),
    "dc3hxp7q": ("ml-wanita",      "SMP", "single_elimination", "PORJAR ML LADIES SMP 2026"),
}

# For this slug, find the existing tournament instead of creating a new one.
HOK_SMA_SLUG = "goxkqyxg"
HOK_SMA_EXISTING_NAME_FRAGMENT = "HOK SMA"

FUZZY_THRESHOLD = 0.7

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def normalize(name: str) -> str:
    name = name.upper().strip()
    # Remove non-printable / non-ASCII characters
    name = re.sub(r"[^\x20-\x7E]", "", name)
    # Normalize school abbreviations
    name = re.sub(r"\bSMPN\b", "SMP NEGERI", name)
    name = re.sub(r"\bSMAN\b", "SMA NEGERI", name)
    name = re.sub(r"\bSMKN\b", "SMK NEGERI", name)
    # Fix reversed word order: "10 NEGERI" → "NEGERI 10"
    name = re.sub(r"\b(\d+)\s+NEGERI\b", r"NEGERI \1", name)
    # Collapse whitespace
    name = re.sub(r"\s+", " ", name).strip()
    return name


def fuzzy_match(query: str, candidates: list[tuple]) -> tuple | None:
    """
    candidates: list of (team_id, team_name) tuples.
    Returns (team_id, team_name, score) or None.
    """
    qn = normalize(query)
    best_score = 0.0
    best = None
    for tid, tname in candidates:
        score = difflib.SequenceMatcher(None, qn, normalize(tname)).ratio()
        if score > best_score:
            best_score = score
            best = (tid, tname, score)
    if best and best[2] >= FUZZY_THRESHOLD:
        return best
    return None


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    conn = psycopg2.connect(**DB_CONFIG)
    conn.autocommit = False
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    # ── Fetch all games keyed by slug ────────────────────────────────────────
    cur.execute("SELECT id, slug, name FROM games")
    games_by_slug = {row["slug"]: row for row in cur.fetchall()}
    print("Games found:", list(games_by_slug.keys()))

    # The SLUG_MAP uses values like "ml-pria", "ml-wanita", "efootball-solo", "efootball-duo", "hok"
    # These match actual game slugs already in the DB.
    def get_game_id(prefix: str) -> str:
        if prefix not in games_by_slug:
            raise ValueError(f"Game slug '{prefix}' not found in DB. Available: {list(games_by_slug.keys())}")
        return str(games_by_slug[prefix]["id"])

    # ── Fetch all approved teams (for fuzzy matching) ────────────────────────
    cur.execute("""
        SELECT t.id, t.name, g.slug AS game_slug
        FROM teams t
        JOIN games g ON g.id = t.game_id
        WHERE t.status = 'approved'
    """)
    all_teams = cur.fetchall()
    # Group by game slug
    teams_by_game: dict[str, list[tuple]] = {}
    for row in all_teams:
        teams_by_game.setdefault(row["game_slug"], []).append((str(row["id"]), row["name"]))
    print(f"Loaded {len(all_teams)} approved teams across {len(teams_by_game)} games.")

    # ── Find existing HOK SMA tournament ────────────────────────────────────
    cur.execute("""
        SELECT id, name FROM tournaments
        WHERE name ILIKE '%HOK SMA%'
        ORDER BY created_at ASC
        LIMIT 1
    """)
    hok_sma_row = cur.fetchone()
    hok_sma_tournament_id = str(hok_sma_row["id"]) if hok_sma_row else None
    if hok_sma_tournament_id:
        print(f"Found existing HOK SMA tournament: '{hok_sma_row['name']}' → {hok_sma_tournament_id}")
    else:
        print("WARNING: No existing HOK SMA tournament found; will create new one for goxkqyxg.")

    # ── Output accumulator ───────────────────────────────────────────────────
    # { tournament_id_str: { team_id_str: seed } }
    bracket_seeds: dict[str, dict[str, int]] = {}

    stats = {
        "tournaments_created": 0,
        "tournaments_reused": 0,
        "teams_matched": 0,
        "teams_placeholder_created": 0,
        "tournament_teams_created": 0,
        "tournament_teams_skipped": 0,
        "seeds_updated": 0,
    }

    # ── Process each Challonge file ──────────────────────────────────────────
    for slug, (game_prefix, school_level, fmt, t_name) in SLUG_MAP.items():
        json_path = CHALLONGE_DIR / f"{slug}.json"
        if not json_path.exists():
            print(f"  [SKIP] {slug}: JSON file not found at {json_path}")
            continue

        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        tournament_data = data.get("tournament", data)
        participants = [p["participant"] for p in tournament_data.get("participants", [])]
        print(f"\n── {slug} ({t_name}) ──────────────────────────────")
        print(f"   Participants: {len(participants)}")

        game_id = get_game_id(game_prefix)
        # game_prefix IS the DB slug (e.g. "ml-pria", "hok", "efootball-solo")
        db_slug = game_prefix

        # ── Resolve tournament_id ────────────────────────────────────────
        is_hok_sma = (slug == HOK_SMA_SLUG)

        if is_hok_sma and hok_sma_tournament_id:
            tournament_id = hok_sma_tournament_id
            stats["tournaments_reused"] += 1
            print(f"   Reusing existing HOK SMA tournament: {tournament_id}")
        else:
            # Check if tournament already exists by name
            cur.execute("SELECT id FROM tournaments WHERE name = %s", (t_name,))
            existing_t = cur.fetchone()
            if existing_t:
                tournament_id = str(existing_t["id"])
                stats["tournaments_reused"] += 1
                print(f"   Tournament already exists: {tournament_id}")
            else:
                tournament_id = str(uuid.uuid4())
                cur.execute("""
                    INSERT INTO tournaments
                        (id, game_id, name, format, stage, best_of, max_teams, status,
                         school_level, created_at, updated_at)
                    VALUES
                        (%s, %s, %s, %s, 'main', 3, 128, 'ongoing',
                         %s, NOW(), NOW())
                """, (tournament_id, game_id, t_name, fmt, school_level))
                stats["tournaments_created"] += 1
                print(f"   Created tournament: {tournament_id}")

        # Candidate teams for fuzzy matching (for this game)
        candidate_teams = teams_by_game.get(db_slug, [])

        # Seeds dict for this tournament
        bracket_seeds[tournament_id] = {}

        for p in participants:
            p_name = p.get("name", "").strip()
            p_seed = p.get("seed")
            if not p_name:
                continue

            if is_hok_sma and hok_sma_tournament_id:
                # For HOK SMA: only update seeds for already-registered teams
                match = fuzzy_match(p_name, candidate_teams)
                if match:
                    team_id, team_name, score = match
                    # Update seed in tournament_teams
                    cur.execute("""
                        UPDATE tournament_teams
                        SET seed = %s
                        WHERE tournament_id = %s AND team_id = %s
                    """, (p_seed, tournament_id, team_id))
                    if cur.rowcount > 0:
                        stats["seeds_updated"] += 1
                        bracket_seeds[tournament_id][team_id] = p_seed
                        print(f"     Seed updated: '{p_name}' → '{team_name}' (score={score:.2f}) seed={p_seed}")
                    else:
                        print(f"     NOTE: matched '{p_name}' → '{team_name}' but not in this tournament_teams row (not registered)")
                else:
                    print(f"     [NO MATCH] '{p_name}' — not in HOK SMA tournament_teams, skipping")
                continue

            # Normal flow: fuzzy match then register
            match = fuzzy_match(p_name, candidate_teams)
            if match:
                team_id, team_name, score = match
                stats["teams_matched"] += 1
                print(f"   Match: '{p_name}' → '{team_name}' (score={score:.2f}) seed={p_seed}")
            else:
                # Create placeholder team
                team_id = str(uuid.uuid4())
                cur.execute("""
                    INSERT INTO teams (id, name, game_id, status, created_at, updated_at)
                    VALUES (%s, %s, %s, 'approved', NOW(), NOW())
                """, (team_id, p_name, game_id))
                stats["teams_placeholder_created"] += 1
                # Add to candidate list for future matches in this tournament
                candidate_teams.append((team_id, p_name))
                teams_by_game.setdefault(db_slug, []).append((team_id, p_name))
                print(f"   Placeholder: '{p_name}' created as new team {team_id}")

            # Check for duplicate registration
            cur.execute("""
                SELECT id FROM tournament_teams
                WHERE tournament_id = %s AND team_id = %s
            """, (tournament_id, team_id))
            existing_tt = cur.fetchone()
            if existing_tt:
                # Update seed if it changed
                if p_seed is not None:
                    cur.execute("""
                        UPDATE tournament_teams SET seed = %s
                        WHERE tournament_id = %s AND team_id = %s
                    """, (p_seed, tournament_id, team_id))
                stats["tournament_teams_skipped"] += 1
                print(f"     (already registered, seed updated to {p_seed})")
            else:
                tt_id = str(uuid.uuid4())
                cur.execute("""
                    INSERT INTO tournament_teams (id, tournament_id, team_id, seed, status)
                    VALUES (%s, %s, %s, %s, 'approved')
                """, (tt_id, tournament_id, team_id, p_seed))
                stats["tournament_teams_created"] += 1

            if p_seed is not None:
                bracket_seeds[tournament_id][team_id] = p_seed

    conn.commit()
    cur.close()
    conn.close()

    # ── Write output ─────────────────────────────────────────────────────────
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(bracket_seeds, f, indent=2)

    print("\n" + "=" * 60)
    print("DONE")
    print(f"  Tournaments created:          {stats['tournaments_created']}")
    print(f"  Tournaments reused:           {stats['tournaments_reused']}")
    print(f"  Teams matched (fuzzy):        {stats['teams_matched']}")
    print(f"  Placeholder teams created:    {stats['teams_placeholder_created']}")
    print(f"  tournament_teams created:     {stats['tournament_teams_created']}")
    print(f"  tournament_teams skipped:     {stats['tournament_teams_skipped']}")
    print(f"  HOK SMA seeds updated:        {stats['seeds_updated']}")
    print(f"\nBracket seeds written to: {OUTPUT_FILE}")
    total_entries = sum(len(v) for v in bracket_seeds.values())
    print(f"  {len(bracket_seeds)} tournaments, {total_entries} seeded entries")


if __name__ == "__main__":
    main()
