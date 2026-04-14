#!/usr/bin/env python3
"""
Create synthetic BYE matches in Round 1 for teams that got auto-advanced by Challonge.
This makes brackets symmetric so the layout engine renders them properly.
"""

import subprocess
import uuid as uuid_lib

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

# Get all non-HOK tournaments with brackets
tournaments = psql("""
    SELECT DISTINCT t.id, t.name, t.best_of
    FROM tournaments t
    JOIN bracket_matches bm ON bm.tournament_id = t.id
    WHERE t.name NOT LIKE '%HOK%'
    ORDER BY t.name
""")

for line in tournaments.split('\n'):
    if '|' not in line:
        continue
    parts = line.split('|')
    tid = parts[0].strip()
    tname = parts[1].strip()
    best_of = int(parts[2].strip()) if parts[2].strip() else 3

    # Find Round 2 matches that are missing Round 1 feeders
    # A R2 match should have 2 feeders. Count how many it has.
    r2_data = psql(f"""
        SELECT r2.id, r2.match_number, r2.team_a_id, r2.team_b_id,
               count(r1.id) as feeder_count,
               array_agg(r1.id) FILTER (WHERE r1.id IS NOT NULL) as feeder_ids
        FROM bracket_matches r2
        LEFT JOIN bracket_matches r1 ON r1.next_match_id = r2.id AND r1.round = 1
        WHERE r2.tournament_id = '{tid}'
        AND r2.round = 2
        GROUP BY r2.id, r2.match_number, r2.team_a_id, r2.team_b_id
        HAVING count(r1.id) < 2
        ORDER BY r2.match_number
    """)

    if not r2_data:
        continue

    print(f"\n{tname}: fixing BYE matches...")

    # Get current max match_number for renumbering
    max_mn = int(psql(f"SELECT COALESCE(MAX(match_number), 0) FROM bracket_matches WHERE tournament_id = '{tid}'"))
    bye_count = 0

    for r2_line in r2_data.split('\n'):
        if '|' not in r2_line:
            continue
        r2_parts = r2_line.split('|')
        r2_id = r2_parts[0].strip()
        r2_mn = r2_parts[1].strip()
        r2_team_a = r2_parts[2].strip() or None
        r2_team_b = r2_parts[3].strip() or None
        feeder_count = int(r2_parts[4].strip())
        feeder_ids_raw = r2_parts[5].strip()

        # Parse existing feeder IDs
        existing_feeders = set()
        if feeder_ids_raw and feeder_ids_raw != '{NULL}':
            for fid in feeder_ids_raw.strip('{}').split(','):
                if fid.strip():
                    existing_feeders.add(fid.strip())

        # Determine which feeder team(s) are from BYE
        # If feeder_count == 0: both teams are BYE-advanced → need 2 BYE matches
        # If feeder_count == 1: one team is BYE-advanced → need 1 BYE match

        # Figure out which team slots are unfed
        # Check if existing feeder(s) feed team_a or team_b
        if feeder_count == 0:
            # Both teams need BYE matches
            for team_id in [r2_team_a, r2_team_b]:
                if not team_id:
                    continue
                max_mn += 1
                bye_id = str(uuid_lib.uuid4())
                psql_exec(f"""
                    INSERT INTO bracket_matches
                    (id, tournament_id, round, match_number, bracket_position,
                     team_a_id, team_b_id, winner_id, loser_id,
                     score_a, score_b, status, best_of, next_match_id)
                    VALUES ('{bye_id}', '{tid}', 1, {max_mn}, 'winners',
                     '{team_id}', NULL, '{team_id}', NULL,
                     NULL, NULL, 'bye', {best_of}, '{r2_id}')
                """)
                bye_count += 1

        elif feeder_count == 1:
            # One team is fed by R1 match, the other is BYE
            # Find which team the existing feeder provides
            feeder_id = list(existing_feeders)[0]
            feeder_winner = psql(f"SELECT winner_id FROM bracket_matches WHERE id = '{feeder_id}'")

            # The BYE team is the one NOT provided by the feeder
            bye_team = None
            if feeder_winner == r2_team_a:
                bye_team = r2_team_b
            elif feeder_winner == r2_team_b:
                bye_team = r2_team_a
            else:
                # Feeder hasn't completed yet — check team_a/team_b of feeder
                f_ta = psql(f"SELECT team_a_id FROM bracket_matches WHERE id = '{feeder_id}'")
                f_tb = psql(f"SELECT team_b_id FROM bracket_matches WHERE id = '{feeder_id}'")
                # The feeder's teams go into one slot of R2
                # The other slot is the BYE team
                if r2_team_a and r2_team_a not in [f_ta, f_tb]:
                    bye_team = r2_team_a
                elif r2_team_b and r2_team_b not in [f_ta, f_tb]:
                    bye_team = r2_team_b
                else:
                    # Can't determine — pick the team without a feeder
                    # Just pick team_b as BYE if team_a might be the feeder output
                    bye_team = r2_team_b

            if bye_team:
                max_mn += 1
                bye_id = str(uuid_lib.uuid4())
                psql_exec(f"""
                    INSERT INTO bracket_matches
                    (id, tournament_id, round, match_number, bracket_position,
                     team_a_id, team_b_id, winner_id, loser_id,
                     score_a, score_b, status, best_of, next_match_id)
                    VALUES ('{bye_id}', '{tid}', 1, {max_mn}, 'winners',
                     '{bye_team}', NULL, '{bye_team}', NULL,
                     NULL, NULL, 'bye', {best_of}, '{r2_id}')
                """)
                bye_count += 1

    print(f"  Created {bye_count} BYE matches in Round 1")

print("\nDone!")
