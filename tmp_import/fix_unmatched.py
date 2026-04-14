#!/usr/bin/env python3
"""Fix unmatched participants by building explicit mappings and re-importing."""

import json
import subprocess
import re
import uuid as uuid_lib

CHALLONGE_API_KEY = "dabd7fdac70d7f11e5fd15ebf7798719cefd719053627dfe"

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
        print(f"  SQL ERROR: {result.stderr.strip()}")
    return result.returncode == 0

def get_team_id(tournament_id, team_name_pattern):
    """Get team ID by ILIKE pattern within a tournament."""
    tid = psql(f"""
        SELECT tm.id FROM tournament_teams tt
        JOIN teams tm ON tm.id = tt.team_id
        WHERE tt.tournament_id = '{tournament_id}'
        AND tm.name ILIKE '{team_name_pattern}'
        LIMIT 1
    """)
    return tid if tid else None

def get_challonge_participant_id(slug, name_pattern):
    """Get Challonge participant ID by name pattern."""
    participants = challonge_get(f"tournaments/{slug}/participants.json")
    pattern = re.compile(name_pattern, re.IGNORECASE)
    for p in participants:
        if pattern.search(p["participant"]["name"]):
            return p["participant"]["id"], p["participant"]["name"]
    return None, None

# ===================================================================
# Build explicit override mappings for each tournament
# These are challonge_participant_id → porjar_team_id
# ===================================================================

overrides = {}  # slug → {challonge_pid: porjar_team_id}

tournaments_to_fix = [
    # (challonge_slug, porjar_tournament_id, list of (challonge_name_pattern, porjar_name_pattern))
    ("nabvj57m", "10562fb8-31fe-4782-8918-bc1803d7d3ab", [
        ("Muhammadiyah.*1.*Denpasar.*A$", "%MUHAMMADIYAH 1 DENPASAR A%"),
        ("6.*DENPASAR.*TEAM.*2", "%NEGERI 6 DENPASAR TIM 2%"),
        ("SMK.*NEGERI.*4.*DENPASAR$", "SMK NEGERI 4 DENPASAR"),
        ("NEGERI.*10.*DENPASAR.*A", "%NEGERI 10 DENPASAR A%"),
    ]),
    ("aabnxzpq", "0d2e9b65-6c30-4f4d-9264-3b6ffb496a14", [
        ("^AMI B$", "AMI %"),  # Need to create this
        ("SPEDHARKA.*B", "SPEDHARKA %"),  # Need to create this
        ("PGRI.*2.*Denpasar", "%PGRI 2 DENPASAR%"),
        ("Santo.*Yoseph.*B", "SANTO YOSEPH %"),  # Need to create this
    ]),
    ("28ypv34w", "b35a62db-dab8-4397-9bad-2a8c98e46a56", [
        ("DENTIM.*C", "%TIMUR C%"),
        ("DENTIM.*B", "%TIMUR B%"),
        ("DENTIM.*D", "%TIMUR D%"),
    ]),
    ("s53o6t4d", "b28390a0-ba20-470f-aea8-37228261d036", [
        ("SMK.*Negeri.*3.*Denpasar", "SMK NEGERI 3 DENPASAR"),
        ("NEGERI.*10.*DENPASAR.*A", "%NEGERI 10 DENPASAR A%"),
    ]),
    ("w7nod5fd", "02c9503f-1c96-48d3-a755-95d7480507a6", [
        ("SMK.*Negeri.*4.*B", "SMK NEGERI 4 DENPASAR%"),  # "B" variant
        ("SMA.*9.*DENPASAR", "%NEGERI 9 DENPASAR%"),
        ("MUHAMMADIYAH.*B$", "%MUHAMMADIYAH 1 DENPASAR B%"),
        ("SMA.*7.*DENPASAR.*A", "%NEGERI 7 DENPASAR A%"),
        ("MUHAMMADIYAH.*A$", "%MUHAMMADIYAH 1 DENPASAR A%"),
    ]),
    ("xw3s592x", "34c7b89c-a4ad-4134-9405-496d08186641", [
        ("SMA.*9.*DENPASAR", "%NEGERI 9 DENPASAR%"),
    ]),
]

print("Building override mappings...\n")

for slug, tid, pairs in tournaments_to_fix:
    print(f"Tournament: {slug} → {tid[:8]}...")
    slug_overrides = {}

    for ch_pattern, pj_pattern in pairs:
        # Get Challonge participant
        ch_pid, ch_name = get_challonge_participant_id(slug, ch_pattern)
        if not ch_pid:
            print(f"  ✗ Challonge '{ch_pattern}' not found!")
            continue

        # Get Porjar team
        pj_tid = get_team_id(tid, pj_pattern)
        if not pj_tid:
            # Team doesn't exist in tournament, need to create
            print(f"  ✗ Porjar '{pj_pattern}' not found in tournament — needs creation")

            # Try to find the team in all teams
            all_tid = psql(f"SELECT id FROM teams WHERE name ILIKE '{pj_pattern}' LIMIT 1")
            if all_tid:
                # Register for tournament
                tt_id = str(uuid_lib.uuid4())
                psql_exec(f"INSERT INTO tournament_teams (id, tournament_id, team_id, status, created_at) VALUES ('{tt_id}', '{tid}', '{all_tid}', 'approved', NOW())")
                pj_tid = all_tid
                print(f"    → Registered existing team {all_tid[:8]}... for tournament")
            else:
                # Create new team
                # Get game_id from tournament
                game_id = psql(f"SELECT game_id FROM tournaments WHERE id = '{tid}'")
                new_tid = str(uuid_lib.uuid4())
                clean_name = pj_pattern.replace('%', '').strip()
                psql_exec(f"INSERT INTO teams (id, name, game_id, status, created_at, updated_at) VALUES ('{new_tid}', '{clean_name}', '{game_id}', 'approved', NOW(), NOW())")
                tt_id = str(uuid_lib.uuid4())
                psql_exec(f"INSERT INTO tournament_teams (id, tournament_id, team_id, status, created_at) VALUES ('{tt_id}', '{tid}', '{new_tid}', 'approved', NOW())")
                pj_tid = new_tid
                print(f"    → Created team '{clean_name}' → {new_tid[:8]}...")

        slug_overrides[ch_pid] = pj_tid
        print(f"  ✓ '{ch_name}' → {pj_tid[:8]}...")

    overrides[slug] = slug_overrides
    print()

# Save overrides for the import script to use
with open("/home/oman/project/porjar/tmp_import/overrides.json", "w") as f:
    # Convert int keys to strings for JSON
    json_overrides = {}
    for slug, mapping in overrides.items():
        json_overrides[slug] = {str(k): v for k, v in mapping.items()}
    json.dump(json_overrides, f, indent=2)

print(f"\nSaved overrides to overrides.json")
print("Now re-run import_challonge.py to apply!")
