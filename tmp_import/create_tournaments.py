"""
create_tournaments.py
Buat tournament untuk 10 kategori yang belum ada, lalu assign tim dari Excel ke tournament.
"""
import os, uuid, difflib
import openpyxl
import psycopg2
import psycopg2.extras

BASE_DIR = "/home/oman/project/porjar/tmp_import/peserta porjar"

DB = dict(host="172.24.0.2", port=5432, dbname="porjar", user="porjar", password="o12S1kJiScjmejzPcIoAgyg9MUq9SD6f")

# folder_name → (game_slug, school_level, tournament_name, excel_file)
FOLDER_MAP = {
    "FREE FIRE SD":             ("ff",            "SD",  "PORJAR FREE FIRE SD 2026",            "SD - PENDAFTARAN FREE FIRE SD (Jawaban).xlsx"),
    "FREE FIRE SMA LAKI-LAKI":  ("ff",            "SMA", "PORJAR FREE FIRE SMA LAKI-LAKI 2026", "LAKI-LAKI SMA - PENDAFTARAN FREE FIRE  (Jawaban).xlsx"),
    "FREE FIRE SMA PEREMPUAN":  ("ff",            "SMA", "PORJAR FREE FIRE SMA PEREMPUAN 2026", "PEREMPUAN SMA - PENDAFTARAN FREE FIRE SMP (Jawaban).xlsx"),
    "FREE FIRE SMP LAKI-LAKI":  ("ff",            "SMP", "PORJAR FREE FIRE SMP LAKI-LAKI 2026", "LAKI LAKI - PENDAFTARAN FREE FIRE SMP (Jawaban).xlsx"),
    "FREE FIRE SMP PEREMPUAN":  ("ff",            "SMP", "PORJAR FREE FIRE SMP PEREMPUAN 2026", "PEREMPUAN - PENDAFTARAN FREE FIRE SMP (Jawaban).xlsx"),
    "PUBGM SMA":                ("pubgm",         "SMA", "PORJAR PUBGM SMA 2026",               "PENDAFTARAN PUBG SMA 2026 (Jawaban).xlsx"),
    "PUBGM SMP":                ("pubgm",         "SMP", "PORJAR PUBGM SMP 2026",               "PENDAFTARAN PUBG SMP 2026 (Jawaban).xlsx"),
    "EFO DUO SD":               ("efootball-duo", "SD",  "PORJAR EFO DUO SD 2026",              "PENDAFTARAN DUO E-FOOTBALL SD (Jawaban).xlsx"),
    "EFO DUO SMP":              ("efootball-duo", "SMP", "PORJAR EFO DUO SMP 2026",             "PENDAFTARAN DUO E-FOOTBALL SMP (Jawaban).xlsx"),
    "EFO SOLO SD":              ("efootball-solo","SD",  "PORJAR EFO SOLO SD 2026",             "PENDAFTARAN SOLO E-FOOTBALL SD (Jawaban).xlsx"),
}

def clean(v):
    if v is None:
        return ""
    return str(v).strip()

def read_team_names(folder_name, excel_file):
    path = os.path.join(BASE_DIR, folder_name, excel_file)
    wb = openpyxl.load_workbook(path)
    ws = wb.active
    names = []
    for row in ws.iter_rows(min_row=2, values_only=True):
        name = clean(row[2])  # NAMA TIM is always col index 2
        if name and name not in ("-", "."):
            names.append(name)
    return names

def fuzzy_match(query, candidates):
    """Returns (team_id, team_name, score) or None."""
    best_score = 0.0
    best = None
    qn = query.upper().strip()
    for tid, tname in candidates:
        score = difflib.SequenceMatcher(None, qn, tname.upper().strip()).ratio()
        if score > best_score:
            best_score = score
            best = (tid, tname, score)
    return best if best and best[2] >= 0.85 else None

def main():
    conn = psycopg2.connect(**DB)
    conn.autocommit = False
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    # Load games
    cur.execute("SELECT id, slug FROM games")
    games = {r["slug"]: str(r["id"]) for r in cur.fetchall()}

    # Load all teams per game slug
    cur.execute("""
        SELECT t.id, t.name, g.slug AS game_slug
        FROM teams t JOIN games g ON g.id = t.game_id
        WHERE t.status = 'approved'
    """)
    teams_by_game = {}
    for r in cur.fetchall():
        teams_by_game.setdefault(r["game_slug"], []).append((str(r["id"]), r["name"]))

    total_created = 0
    total_assigned = 0
    total_unmatched = 0

    for folder_name, (game_slug, school_level, t_name, excel_file) in FOLDER_MAP.items():
        print(f"\n── {folder_name} → {t_name} ──────────────────────────")

        game_id = games.get(game_slug)
        if not game_id:
            print(f"  [ERROR] Game slug '{game_slug}' tidak ditemukan di DB")
            continue

        # Buat tournament jika belum ada
        cur.execute("SELECT id FROM tournaments WHERE name = %s", (t_name,))
        row = cur.fetchone()
        if row:
            tournament_id = str(row["id"])
            print(f"  [SKIP] Tournament sudah ada: {tournament_id}")
        else:
            tournament_id = str(uuid.uuid4())
            cur.execute("""
                INSERT INTO tournaments
                    (id, game_id, name, format, stage, best_of, max_teams, status,
                     school_level, created_at, updated_at)
                VALUES (%s, %s, %s, 'single_elimination', 'main', 3, 128, 'ongoing',
                        %s, NOW(), NOW())
            """, (tournament_id, game_id, t_name, school_level))
            print(f"  [OK] Tournament dibuat: {tournament_id}")
            total_created += 1

        # Baca nama tim dari Excel
        team_names = read_team_names(folder_name, excel_file)
        print(f"  Excel: {len(team_names)} tim")

        candidates = teams_by_game.get(game_slug, [])

        assigned = 0
        unmatched = []
        seed = 1
        for tname in team_names:
            # Cari exact match dulu
            match = next(((tid, tn) for tid, tn in candidates if tn.strip().upper() == tname.strip().upper()), None)
            if match:
                team_id, _ = match
            else:
                # Fuzzy match
                result = fuzzy_match(tname, candidates)
                if result:
                    team_id, matched_name, score = result
                    print(f"  [FUZZY] '{tname}' → '{matched_name}' ({score:.2f})")
                else:
                    unmatched.append(tname)
                    print(f"  [UNMATCHED] '{tname}'")
                    continue

            # Cek apakah sudah ada di tournament ini
            cur.execute(
                "SELECT id FROM tournament_teams WHERE tournament_id = %s AND team_id = %s",
                (tournament_id, team_id)
            )
            if cur.fetchone():
                seed += 1
                assigned += 1
                continue

            cur.execute("""
                INSERT INTO tournament_teams
                    (id, tournament_id, team_id, status, seed)
                VALUES (%s, %s, %s, 'approved', %s)
            """, (str(uuid.uuid4()), tournament_id, team_id, seed))
            seed += 1
            assigned += 1

        print(f"  Assigned: {assigned}, Unmatched: {len(unmatched)}")
        total_assigned += assigned
        total_unmatched += len(unmatched)

    conn.commit()
    print(f"\n{'='*50}")
    print(f"Tournaments dibuat : {total_created}")
    print(f"Tim di-assign      : {total_assigned}")
    print(f"Tidak cocok        : {total_unmatched}")
    conn.close()

if __name__ == "__main__":
    main()
