"""setup_rules.py — Set tournament format dan BR point rules sesuai peraturan PPTX."""
import psycopg2, psycopg2.extras, uuid

DB = dict(host="172.24.0.2", port=5432, dbname="porjar", user="porjar", password="o12S1kJiScjmejzPcIoAgyg9MUq9SD6f")

# ── BR Point rules ────────────────────────────────────────────────────────────
# PUBGM: placement #1=10, #2=6, #3=5, #4=4, #5=3, #6=2, #7=1, #8=1, #9-20=0
PUBGM_PLACEMENT = {1:10, 2:6, 3:5, 4:4, 5:3, 6:2, 7:1, 8:1}
PUBGM_KILL = 1.0

# Free Fire: placement #1=12, #2=9, #3=8, #4=7, #5=6, #6=5, #7=4, #8=3, #9=2, #10=1, #11+=0
FF_PLACEMENT = {1:12, 2:9, 3:8, 4:7, 5:6, 6:5, 7:4, 8:3, 9:2, 10:1}
FF_KILL = 1.0

# ── Tournament configs ────────────────────────────────────────────────────────
# (tournament_name, format, kill_point_value, placement_rules_dict)
TOURNAMENT_RULES = [
    # PUBGM
    ("PORJAR PUBGM SMA 2026",               "battle_royale_points", PUBGM_KILL, PUBGM_PLACEMENT),
    ("PORJAR PUBGM SMP 2026",               "battle_royale_points", PUBGM_KILL, PUBGM_PLACEMENT),
    # Free Fire (semua kategori)
    ("PORJAR FREE FIRE SD 2026",            "battle_royale_points", FF_KILL, FF_PLACEMENT),
    ("PORJAR FREE FIRE SMA LAKI-LAKI 2026", "battle_royale_points", FF_KILL, FF_PLACEMENT),
    ("PORJAR FREE FIRE SMA PEREMPUAN 2026", "battle_royale_points", FF_KILL, FF_PLACEMENT),
    ("PORJAR FREE FIRE SMP LAKI-LAKI 2026", "battle_royale_points", FF_KILL, FF_PLACEMENT),
    ("PORJAR FREE FIRE SMP PEREMPUAN 2026", "battle_royale_points", FF_KILL, FF_PLACEMENT),
    # EFO SMP — group stage → knockout
    ("PORJAR EFO SOLO SMP",                 "group_stage_playoff",  None, None),
    ("PORJAR EFO DUO SMP 2026",             "group_stage_playoff",  None, None),
    # EFO SMA — single elimination (sudah benar, tapi pastikan best_of)
    ("PORJAR EFO SOLO SMA",                 "single_elimination",   None, None),
    ("PORJAR EFO DUO SMA",                  "single_elimination",   None, None),
    # EFO SD
    ("PORJAR EFO SOLO SD 2026",             "single_elimination",   None, None),
    ("PORJAR EFO DUO SD 2026",              "single_elimination",   None, None),
]

def main():
    conn = psycopg2.connect(**DB)
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    for t_name, fmt, kill_val, placement_rules in TOURNAMENT_RULES:
        cur.execute("SELECT id, format, kill_point_value FROM tournaments WHERE name = %s", (t_name,))
        row = cur.fetchone()
        if not row:
            print(f"  [SKIP] Tidak ditemukan: {t_name}")
            continue

        tid = str(row["id"])

        # Update format & kill_point_value
        if kill_val is not None:
            cur.execute(
                "UPDATE tournaments SET format=%s, kill_point_value=%s, updated_at=NOW() WHERE id=%s",
                (fmt, kill_val, tid)
            )
        else:
            cur.execute(
                "UPDATE tournaments SET format=%s, updated_at=NOW() WHERE id=%s",
                (fmt, tid)
            )
        print(f"  [OK] {t_name} → format={fmt}" + (f", kill={kill_val}" if kill_val else ""))

        # Insert BR placement point rules
        if placement_rules:
            # Delete existing rules first
            cur.execute("DELETE FROM br_point_rules WHERE tournament_id=%s", (tid,))
            for placement, points in placement_rules.items():
                cur.execute(
                    "INSERT INTO br_point_rules (id, tournament_id, placement, points) VALUES (%s,%s,%s,%s)",
                    (str(uuid.uuid4()), tid, placement, points)
                )
            print(f"       → {len(placement_rules)} placement rules inserted")

    conn.commit()
    print("\nDone.")
    conn.close()

if __name__ == "__main__":
    main()
