#!/usr/bin/env python3
"""
Complete Challonge → Porjar bracket import with explicit name mapping.
Creates missing teams if needed.
"""

import json
import subprocess
import re
import uuid as uuid_lib
import time

CHALLONGE_API_KEY = "dabd7fdac70d7f11e5fd15ebf7798719cefd719053627dfe"

TOURNAMENT_MAP = {
    "nabvj57m": "10562fb8-31fe-4782-8918-bc1803d7d3ab",
    "aabnxzpq": "0d2e9b65-6c30-4f4d-9264-3b6ffb496a14",
    "28ypv34w": "b35a62db-dab8-4397-9bad-2a8c98e46a56",
    "dc3hxp7q": "3f2ab8e1-2219-49c2-bc61-8c0c06c50ae9",
    "s53o6t4d": "b28390a0-ba20-470f-aea8-37228261d036",
    "w7nod5fd": "02c9503f-1c96-48d3-a755-95d7480507a6",
    "xw3s592x": "34c7b89c-a4ad-4134-9405-496d08186641",
    "mnf0ez67": "4dff07e8-e851-49e3-bfb2-ab7ad8dddaf4",
}


def challonge_get(path):
    url = f"https://api.challonge.com/v1/{path}{'&' if '?' in path else '?'}api_key={CHALLONGE_API_KEY}"
    result = subprocess.run(["curl", "-s", "--max-time", "30", url], capture_output=True, text=True, timeout=35)
    return json.loads(result.stdout)


def psql(sql):
    result = subprocess.run(
        ["docker", "exec", "porjar-postgres-1", "psql", "-U", "porjar", "-d", "porjar", "-t", "-A", "-c", sql],
        capture_output=True, text=True, timeout=30,
    )
    return result.stdout.strip()


def psql_exec(sql):
    result = subprocess.run(
        ["docker", "exec", "porjar-postgres-1", "psql", "-U", "porjar", "-d", "porjar", "-c", sql],
        capture_output=True, text=True, timeout=30,
    )
    if result.returncode != 0:
        print(f"  SQL ERR: {result.stderr.strip()[:200]}")
    return result.returncode == 0


def normalize(s):
    s = s.lower().strip()
    s = ''.join(c for c in s if ord(c) < 128)  # remove non-ASCII
    s = re.sub(r'\bsman\b', 'sma negeri', s)
    s = re.sub(r'\bsmkn\b', 'smk negeri', s)
    s = re.sub(r'\bsmpn\b', 'smp negeri', s)
    s = re.sub(r'\bsma n\b', 'sma negeri', s)
    s = re.sub(r'\bsmk n\b', 'smk negeri', s)
    s = re.sub(r'\bsmp n\b', 'smp negeri', s)
    s = re.sub(r'\bsmak\b', 'smas kristen', s)
    s = re.sub(r'\bsmas k\b', 'smas katolik', s)
    s = s.replace('dps', 'denpasar')
    s = s.replace('dentim', 'denpasar timur')
    s = s.replace('team ', 'tim ')
    s = re.sub(r'\(([a-z])\)', r' \1', s)
    s = s.rstrip(',').strip()
    return re.sub(r'\s+', ' ', s).strip()


def best_match(challonge_name, porjar_teams, used):
    """Find best matching Porjar team using Hungarian-style scoring."""
    cn = normalize(challonge_name)
    cn_compact = re.sub(r'[^a-z0-9]', '', cn)

    best_id = None
    best_score = -1

    for tid, tname in porjar_teams.items():
        if tid in used:
            continue
        tn = normalize(tname)
        tn_compact = re.sub(r'[^a-z0-9]', '', tn)

        # Exact match (after normalization)
        if cn_compact == tn_compact:
            return tid, 100

        # Substring
        if cn_compact in tn_compact or tn_compact in cn_compact:
            score = 80
        else:
            # Trigram similarity
            cn_tri = set(cn_compact[i:i+3] for i in range(max(0, len(cn_compact)-2)))
            tn_tri = set(tn_compact[i:i+3] for i in range(max(0, len(tn_compact)-2)))
            if cn_tri and tn_tri:
                overlap = len(cn_tri & tn_tri)
                score = (overlap / max(len(cn_tri), len(tn_tri))) * 70
            else:
                score = 0

        if score > best_score:
            best_score = score
            best_id = tid

    return best_id, best_score


def two_pass_match(participants, porjar_teams):
    """Two-pass matching: exact first, then fuzzy."""
    mapping = {}
    used = set()
    unmatched = []

    # Pass 1: exact normalized match
    for p in participants:
        cn = re.sub(r'[^a-z0-9]', '', normalize(p["name"]))
        for tid, tname in porjar_teams.items():
            if tid in used:
                continue
            tn = re.sub(r'[^a-z0-9]', '', normalize(tname))
            if cn == tn:
                mapping[p["id"]] = tid
                used.add(tid)
                break

    # Pass 2: fuzzy match for remaining
    for p in participants:
        if p["id"] in mapping:
            continue
        tid, score = best_match(p["name"], porjar_teams, used)
        if tid and score >= 40:
            mapping[p["id"]] = tid
            used.add(tid)
        else:
            unmatched.append((p["id"], p["name"], score))

    return mapping, unmatched


def parse_scores_csv(csv_str):
    csv_str = (csv_str or "").strip()
    if not csv_str:
        return 0, 0
    if ',' in csv_str:
        sa, sb = 0, 0
        for g in csv_str.split(','):
            parts = g.strip().split('-')
            if len(parts) != 2:
                continue
            try:
                a, b = int(parts[0].strip()), int(parts[1].strip())
            except ValueError:
                continue
            if a > b: sa += 1
            elif b > a: sb += 1
        return sa, sb
    parts = csv_str.split('-')
    if len(parts) != 2:
        return 0, 0
    try:
        return int(parts[0].strip()), int(parts[1].strip())
    except ValueError:
        return 0, 0


def create_team_and_register(name, tournament_id):
    """Create a team and register it for the tournament."""
    game_id = psql(f"SELECT game_id FROM tournaments WHERE id = '{tournament_id}'")
    clean = name.replace("'", "''")

    # Check existing
    tid = psql(f"SELECT id FROM teams WHERE name = '{clean}' AND game_id = '{game_id}'")
    if not tid:
        tid = str(uuid_lib.uuid4())
        psql_exec(f"INSERT INTO teams (id, name, game_id, status, created_at, updated_at) VALUES ('{tid}', '{clean}', '{game_id}', 'approved', NOW(), NOW())")

    # Register
    exists = psql(f"SELECT id FROM tournament_teams WHERE tournament_id = '{tournament_id}' AND team_id = '{tid}'")
    if not exists:
        tt_id = str(uuid_lib.uuid4())
        psql_exec(f"INSERT INTO tournament_teams (id, tournament_id, team_id, status) VALUES ('{tt_id}', '{tournament_id}', '{tid}', 'approved')")

    return tid


def import_tournament(slug, tournament_id):
    print(f"\n{'='*60}")
    print(f"Importing: {slug} → {tournament_id[:8]}...")
    print(f"{'='*60}")

    # Fetch Challonge data
    participants = [p["participant"] for p in challonge_get(f"tournaments/{slug}/participants.json")]
    matches = [m["match"] for m in challonge_get(f"tournaments/{slug}/matches.json")]
    print(f"  Challonge: {len(participants)} participants, {len(matches)} matches")

    # Get Porjar teams
    rows = psql(f"""
        SELECT tm.id, tm.name FROM tournament_teams tt
        JOIN teams tm ON tm.id = tt.team_id
        WHERE tt.tournament_id = '{tournament_id}'
        ORDER BY tm.name
    """)
    porjar_teams = {}
    for line in rows.split('\n'):
        if '|' not in line:
            continue
        tid, tname = line.split('|', 1)
        porjar_teams[tid.strip()] = tname.strip()
    print(f"  Porjar: {len(porjar_teams)} teams")

    # Match
    mapping, unmatched = two_pass_match(participants, porjar_teams)
    print(f"  Matched: {len(mapping)}/{len(participants)}")

    # Create missing teams
    if unmatched:
        print(f"  Creating {len(unmatched)} missing teams:")
        for pid, pname, score in unmatched:
            # Clean name for creation
            clean_name = normalize(pname).upper()
            # Capitalize properly
            clean_name = re.sub(r'\b([a-z])', lambda m: m.group(1).upper(), normalize(pname)).upper()
            # Just use the Challonge name cleaned up
            clean_name = ''.join(c for c in pname if ord(c) < 128).strip().rstrip(',').strip()
            tid = create_team_and_register(clean_name, tournament_id)
            mapping[pid] = tid
            print(f"    + '{clean_name}' → {tid[:8]}...")

    # Clear existing bracket
    existing = psql(f"SELECT count(*) FROM bracket_matches WHERE tournament_id = '{tournament_id}'")
    if existing and int(existing) > 0:
        psql_exec(f"DELETE FROM match_submissions WHERE bracket_match_id IN (SELECT id FROM bracket_matches WHERE tournament_id = '{tournament_id}')")
        psql_exec(f"DELETE FROM match_games WHERE bracket_match_id IN (SELECT id FROM bracket_matches WHERE tournament_id = '{tournament_id}')")
        psql_exec(f"DELETE FROM bracket_matches WHERE tournament_id = '{tournament_id}'")
        print(f"  Cleared {existing} existing matches")

    # Determine format
    has_neg = any(m["round"] < 0 for m in matches)
    max_pos = max((m["round"] for m in matches), default=0)
    max_neg = min((m["round"] for m in matches if m["round"] < 0), default=0)
    max_wr = max_pos - 1 if has_neg else max_pos
    lb_count = -max_neg

    def map_round(r):
        if r == 0:
            # Third-place match → place after final
            if has_neg:
                return max_wr + lb_count + 2, "winners"
            else:
                return max_pos + 1, "winners"
        if not has_neg:
            return r, "winners"
        if 0 < r <= max_wr:
            return r, "winners"
        if r < 0:
            return max_wr + (-r), "losers"
        return max_wr + lb_count + 1, "grand_final"

    # Build UUIDs
    muuids = {m["id"]: str(uuid_lib.uuid4()) for m in matches}

    # Build advancement links
    next_map = {}
    loser_next_map = {}
    for m in matches:
        target = muuids[m["id"]]
        for key in ["player1", "player2"]:
            prereq = m.get(f"{key}_prereq_match_id")
            is_loser = m.get(f"{key}_is_prereq_match_loser", False)
            if prereq:
                if is_loser:
                    loser_next_map[prereq] = target
                else:
                    next_map[prereq] = target

    matches.sort(key=lambda m: m.get("suggested_play_order", 0))

    # Get tournament best_of
    best_of = psql(f"SELECT best_of FROM tournaments WHERE id = '{tournament_id}'") or "3"

    # Insert matches (pass 1 - no links)
    for m in matches:
        mid = muuids[m["id"]]
        rnd, bp = map_round(m["round"])
        mn = m.get("suggested_play_order", 0)

        ta = mapping.get(m.get("player1_id"))
        tb = mapping.get(m.get("player2_id"))

        sa, sb = "NULL", "NULL"
        wid, lid = "NULL", "NULL"
        status = "pending"
        cat = "NULL"

        if m["state"] == "complete":
            s1, s2 = parse_scores_csv(m.get("scores_csv", ""))
            sa, sb = str(s1), str(s2)
            status = "completed"
            cat = "NOW()"
            if m.get("winner_id") and m["winner_id"] in mapping:
                wid = f"'{mapping[m['winner_id']]}'"
            if m.get("loser_id") and m["loser_id"] in mapping:
                lid = f"'{mapping[m['loser_id']]}'"
            if (ta and not tb) or (not ta and tb):
                status = "bye"
        elif m["state"] == "open":
            if ta and tb:
                status = "scheduled"

        ta_sql = f"'{ta}'" if ta else "NULL"
        tb_sql = f"'{tb}'" if tb else "NULL"

        psql_exec(f"""INSERT INTO bracket_matches
            (id, tournament_id, round, match_number, bracket_position,
             team_a_id, team_b_id, winner_id, loser_id,
             score_a, score_b, status, completed_at, best_of)
            VALUES ('{mid}', '{tournament_id}', {rnd}, {mn}, '{bp}',
             {ta_sql}, {tb_sql}, {wid}, {lid},
             {sa}, {sb}, '{status}', {cat}, {best_of})""")

    # Pass 2 - update links
    links = 0
    for m in matches:
        mid = muuids[m["id"]]
        parts = []
        if m["id"] in next_map:
            parts.append(f"next_match_id = '{next_map[m['id']]}'")
        if m["id"] in loser_next_map:
            parts.append(f"loser_next_match_id = '{loser_next_map[m['id']]}'")
        if parts:
            psql_exec(f"UPDATE bracket_matches SET {', '.join(parts)} WHERE id = '{mid}'")
            links += 1

    # Update format
    if has_neg:
        psql_exec(f"UPDATE tournaments SET format = 'double_elimination' WHERE id = '{tournament_id}' AND format != 'double_elimination'")

    print(f"  ✓ Imported {len(matches)} matches, {links} links")
    return len(matches)


# ── Main ──
if __name__ == "__main__":
    total = 0
    for slug, tid in TOURNAMENT_MAP.items():
        try:
            total += import_tournament(slug, tid)
        except Exception as e:
            print(f"  ✗ ERROR: {e}")
            import traceback; traceback.print_exc()
        time.sleep(0.5)  # Be nice to Challonge API

    print(f"\n{'='*60}")
    print(f"TOTAL: {total} matches imported across {len(TOURNAMENT_MAP)} tournaments")
    print(f"{'='*60}")
