#!/usr/bin/env python3
"""Import Challonge brackets into Porjar DB."""

import json
import subprocess
import sys
import urllib.request
import uuid
import re

CHALLONGE_API_KEY = "dabd7fdac70d7f11e5fd15ebf7798719cefd719053627dfe"

# Challonge slug → Porjar tournament ID mapping
TOURNAMENT_MAP = {
    "nabvj57m": "10562fb8-31fe-4782-8918-bc1803d7d3ab",  # ML SMA LAKI-LAKI
    "aabnxzpq": "0d2e9b65-6c30-4f4d-9264-3b6ffb496a14",  # ML SMP LAKI-LAKI
    "28ypv34w": "b35a62db-dab8-4397-9bad-2a8c98e46a56",  # ML SD
    "ulbvn63d": "3f2ab8e1-2219-49c2-bc61-8c0c06c50ae9",  # ML SMP LADIES (9 participants - older)
    "s53o6t4d": "b28390a0-ba20-470f-aea8-37228261d036",  # ML SMA LADIES
    "w7nod5fd": "02c9503f-1c96-48d3-a755-95d7480507a6",  # EFO SOLO SMA
    "xw3s592x": "34c7b89c-a4ad-4134-9405-496d08186641",  # EFO DUO SMA
    "mnf0ez67": "4dff07e8-e851-49e3-bfb2-ab7ad8dddaf4",  # EFO SOLO SMP
    # dc3hxp7q = PORJAR ML LADIES SMP 2026 (10 participants, newer) - same target as ulbvn63d
    # Skip this one since ulbvn63d maps to the same tournament
}


def challonge_get(path):
    url = f"https://api.challonge.com/v1/{path}{'&' if '?' in path else '?'}api_key={CHALLONGE_API_KEY}"
    result = subprocess.run(
        ["curl", "-s", "--max-time", "30", url],
        capture_output=True, text=True, timeout=35,
    )
    if result.returncode != 0:
        raise Exception(f"curl failed: {result.stderr}")
    return json.loads(result.stdout)


def psql(sql):
    """Run SQL in Porjar postgres."""
    result = subprocess.run(
        ["docker", "exec", "porjar-postgres-1", "psql", "-U", "porjar", "-d", "porjar", "-t", "-A", "-c", sql],
        capture_output=True, text=True, timeout=30,
    )
    if result.returncode != 0:
        print(f"  SQL ERROR: {result.stderr.strip()}", file=sys.stderr)
        return ""
    return result.stdout.strip()


def psql_exec(sql):
    """Execute SQL (no output expected)."""
    result = subprocess.run(
        ["docker", "exec", "porjar-postgres-1", "psql", "-U", "porjar", "-d", "porjar", "-c", sql],
        capture_output=True, text=True, timeout=30,
    )
    if result.returncode != 0:
        print(f"  SQL ERROR: {result.stderr.strip()}", file=sys.stderr)
        return False
    return True


def normalize(s):
    """Normalize name: expand common abbreviations, remove non-alphanumeric."""
    s = s.lower().strip()
    # Remove special unicode chars (zero-width, etc)
    s = re.sub(r'[^\x00-\x7f]', '', s)
    # Expand common abbreviations
    s = re.sub(r'\bsman\b', 'sma negeri', s)
    s = re.sub(r'\bsmkn\b', 'smk negeri', s)
    s = re.sub(r'\bsmpn\b', 'smp negeri', s)
    s = re.sub(r'\bsmak\b', 'smas kristen', s)
    s = re.sub(r'\bsma n\b', 'sma negeri', s)
    s = re.sub(r'\bsmk n\b', 'smk negeri', s)
    s = re.sub(r'\bsmp n\b', 'smp negeri', s)
    s = re.sub(r'\bsma k\b', 'smas katolik', s)
    s = re.sub(r'\bsmas k\b', 'smas katolik', s)
    # Common variations
    s = s.replace('dps', 'denpasar')
    s = s.replace('dentim', 'denpasar timur')
    s = s.replace('denbar', 'denpasar barat')
    s = s.replace('denut', 'denpasar utara')
    s = s.replace('densel', 'denpasar selatan')
    # "team 1" → "tim 1"
    s = s.replace('team ', 'tim ')
    # "(a)" → "a", "(b)" → "b"
    s = re.sub(r'\(([a-z])\)', r'\1', s)
    # Remove trailing comma
    s = s.rstrip(',')
    # Remove non-alphanumeric
    return re.sub(r'[^a-z0-9]', '', s)


def get_porjar_teams(tournament_id):
    """Get teams registered for a Porjar tournament."""
    rows = psql(f"""
        SELECT tm.id, tm.name
        FROM tournament_teams tt
        JOIN teams tm ON tm.id = tt.team_id
        WHERE tt.tournament_id = '{tournament_id}'
        ORDER BY tm.name
    """)
    teams = {}
    for line in rows.split('\n'):
        if '|' not in line:
            continue
        tid, tname = line.split('|', 1)
        teams[tid.strip()] = tname.strip()
    return teams  # {uuid: name}


def match_teams(challonge_participants, porjar_teams):
    """Match Challonge participants to Porjar teams by name similarity.
    Returns: {challonge_participant_id: porjar_team_uuid}
    """
    mapping = {}
    # Build normalized lookup for porjar teams
    porjar_norm = {}  # normalized_name → (uuid, original_name)
    for tid, tname in porjar_teams.items():
        porjar_norm[normalize(tname)] = (tid, tname)

    used_porjar = set()
    unmatched = []

    for p in challonge_participants:
        pid = p["id"]
        pname = p["name"]
        pnorm = normalize(pname)

        # Exact match
        if pnorm in porjar_norm and porjar_norm[pnorm][0] not in used_porjar:
            mapping[pid] = porjar_norm[pnorm][0]
            used_porjar.add(porjar_norm[pnorm][0])
            continue

        # Contains match
        best = None
        best_score = 0
        for tnorm, (tid, tname) in porjar_norm.items():
            if tid in used_porjar:
                continue
            # Calculate overlap score
            if pnorm == tnorm:
                score = 100
            elif pnorm in tnorm or tnorm in pnorm:
                score = 80
            else:
                # Word-level matching
                pwords = set(pnorm[i:i+3] for i in range(len(pnorm)-2))
                twords = set(tnorm[i:i+3] for i in range(len(tnorm)-2))
                if pwords and twords:
                    overlap = len(pwords & twords)
                    score = (overlap / max(len(pwords), len(twords))) * 70
                else:
                    score = 0

            if score > best_score:
                best_score = score
                best = (tid, tname)

        if best and best_score >= 40:
            mapping[pid] = best[0]
            used_porjar.add(best[0])
        else:
            unmatched.append((pid, pname, best[1] if best else "???", best_score if best else 0))

    return mapping, unmatched


def parse_scores_csv(csv_str):
    csv_str = csv_str.strip()
    if not csv_str:
        return 0, 0

    if ',' in csv_str:
        # Multi-game: count wins
        sa, sb = 0, 0
        for g in csv_str.split(','):
            parts = g.strip().split('-')
            if len(parts) != 2:
                continue
            a, b = int(parts[0].strip()), int(parts[1].strip())
            if a > b:
                sa += 1
            elif b > a:
                sb += 1
        return sa, sb

    parts = csv_str.split('-')
    if len(parts) != 2:
        return 0, 0
    return int(parts[0].strip()), int(parts[1].strip())


def import_tournament(challonge_slug, porjar_tournament_id):
    print(f"\n{'='*60}")
    print(f"Importing: {challonge_slug} → {porjar_tournament_id}")
    print(f"{'='*60}")

    # Fetch Challonge data
    print("  Fetching Challonge participants...")
    participants_raw = challonge_get(f"tournaments/{challonge_slug}/participants.json")
    participants = [p["participant"] for p in participants_raw]
    print(f"  → {len(participants)} participants")

    print("  Fetching Challonge matches...")
    matches_raw = challonge_get(f"tournaments/{challonge_slug}/matches.json")
    matches = [m["match"] for m in matches_raw]
    print(f"  → {len(matches)} matches")

    # Get Porjar teams
    print("  Loading Porjar teams...")
    porjar_teams = get_porjar_teams(porjar_tournament_id)
    print(f"  → {len(porjar_teams)} teams registered")

    # Match teams
    mapping, unmatched = match_teams(participants, porjar_teams)
    print(f"  → Matched {len(mapping)}/{len(participants)} participants")

    if unmatched:
        print(f"  ⚠ UNMATCHED ({len(unmatched)}):")
        for pid, pname, closest, score in unmatched:
            print(f"    - '{pname}' (closest: '{closest}', score: {score:.0f})")

    # Check for existing bracket
    existing = psql(f"SELECT count(*) FROM bracket_matches WHERE tournament_id = '{porjar_tournament_id}'")
    if existing and int(existing) > 0:
        print(f"  Clearing {existing} existing bracket matches...")
        # Delete submissions and match_games first
        psql_exec(f"""
            DELETE FROM match_submissions WHERE bracket_match_id IN
            (SELECT id FROM bracket_matches WHERE tournament_id = '{porjar_tournament_id}');
        """)
        psql_exec(f"""
            DELETE FROM match_games WHERE bracket_match_id IN
            (SELECT id FROM bracket_matches WHERE tournament_id = '{porjar_tournament_id}');
        """)
        psql_exec(f"DELETE FROM bracket_matches WHERE tournament_id = '{porjar_tournament_id}'")
        print("  → Cleared")

    # Determine format
    has_negative = any(m["round"] < 0 for m in matches)
    max_positive = max((m["round"] for m in matches), default=0)
    max_negative = min((m["round"] for m in matches if m["round"] < 0), default=0)
    is_double_elim = has_negative

    max_wr = max_positive - 1 if is_double_elim else max_positive
    lb_count = -max_negative if is_double_elim else 0

    def map_round(challonge_round):
        if not is_double_elim:
            return challonge_round, "winners"
        if challonge_round > 0 and challonge_round <= max_wr:
            return challonge_round, "winners"
        if challonge_round < 0:
            return max_wr + (-challonge_round), "losers"
        # Grand final
        return max_wr + lb_count + 1, "grand_final"

    # Generate UUIDs for each match
    match_uuids = {}  # challonge match ID → UUID
    for m in matches:
        match_uuids[m["id"]] = str(uuid.uuid4())

    # Build advancement links (reverse prereq relationships)
    next_match = {}       # challonge match ID → next match UUID (winner goes to)
    loser_next_match = {} # challonge match ID → loser next match UUID

    for m in matches:
        target_uuid = match_uuids[m["id"]]

        if m.get("player1_prereq_match_id"):
            prereq_id = m["player1_prereq_match_id"]
            if m.get("player1_is_prereq_match_loser"):
                loser_next_match[prereq_id] = target_uuid
            else:
                next_match[prereq_id] = target_uuid

        if m.get("player2_prereq_match_id"):
            prereq_id = m["player2_prereq_match_id"]
            if m.get("player2_is_prereq_match_loser"):
                loser_next_match[prereq_id] = target_uuid
            else:
                next_match[prereq_id] = target_uuid

    # Sort by suggested_play_order
    matches.sort(key=lambda m: m.get("suggested_play_order", 0))

    # Build SQL inserts
    print("  Inserting bracket matches...")
    insert_count = 0
    for m in matches:
        mid = match_uuids[m["id"]]
        porjar_round, bracket_pos = map_round(m["round"])
        match_number = m.get("suggested_play_order", 0)

        # Map teams
        team_a = mapping.get(m.get("player1_id")) if m.get("player1_id") else None
        team_b = mapping.get(m.get("player2_id")) if m.get("player2_id") else None

        # Scores & status
        score_a = "NULL"
        score_b = "NULL"
        winner_id = "NULL"
        loser_id = "NULL"
        status = "pending"
        completed_at = "NULL"

        if m["state"] == "complete":
            sa, sb = parse_scores_csv(m.get("scores_csv", ""))
            score_a = str(sa)
            score_b = str(sb)
            status = "completed"
            completed_at = "NOW()"

            if m.get("winner_id") and m["winner_id"] in mapping:
                winner_id = f"'{mapping[m['winner_id']]}'"
            if m.get("loser_id") and m["loser_id"] in mapping:
                loser_id = f"'{mapping[m['loser_id']]}'"

            # BYE detection
            if (team_a and not team_b) or (not team_a and team_b):
                status = "bye"
        elif m["state"] == "open":
            if team_a and team_b:
                status = "scheduled"

        team_a_sql = f"'{team_a}'" if team_a else "NULL"
        team_b_sql = f"'{team_b}'" if team_b else "NULL"

        sql = f"""
            INSERT INTO bracket_matches (
                id, tournament_id, round, match_number, bracket_position,
                team_a_id, team_b_id, winner_id, loser_id,
                score_a, score_b, status, completed_at, best_of
            ) VALUES (
                '{mid}', '{porjar_tournament_id}', {porjar_round}, {match_number}, '{bracket_pos}',
                {team_a_sql}, {team_b_sql}, {winner_id}, {loser_id},
                {score_a}, {score_b}, '{status}', {completed_at}, 3
            );
        """
        psql_exec(sql)
        insert_count += 1

    print(f"  → Inserted {insert_count} matches")

    # Update advancement links (pass 2)
    print("  Updating advancement links...")
    link_count = 0
    for m in matches:
        mid = match_uuids[m["id"]]
        updates = []
        if m["id"] in next_match:
            updates.append(f"next_match_id = '{next_match[m['id']]}'")
        if m["id"] in loser_next_match:
            updates.append(f"loser_next_match_id = '{loser_next_match[m['id']]}'")

        if updates:
            sql = f"UPDATE bracket_matches SET {', '.join(updates)} WHERE id = '{mid}'"
            psql_exec(sql)
            link_count += 1

    print(f"  → Updated {link_count} advancement links")

    # Update tournament format if needed
    if is_double_elim:
        psql_exec(f"UPDATE tournaments SET format = 'double_elimination' WHERE id = '{porjar_tournament_id}' AND format != 'double_elimination'")
    else:
        psql_exec(f"UPDATE tournaments SET format = 'single_elimination' WHERE id = '{porjar_tournament_id}' AND format NOT IN ('single_elimination', 'group_stage_playoff')")

    print(f"  ✓ Done! ({insert_count} matches, {link_count} links)")
    return insert_count, len(unmatched)


# ── Main ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    total_matches = 0
    total_unmatched = 0

    for slug, tid in TOURNAMENT_MAP.items():
        try:
            matches, unmatched = import_tournament(slug, tid)
            total_matches += matches
            total_unmatched += unmatched
        except Exception as e:
            print(f"  ✗ ERROR: {e}")

    print(f"\n{'='*60}")
    print(f"SUMMARY: Imported {total_matches} matches, {total_unmatched} unmatched participants")
    print(f"{'='*60}")
