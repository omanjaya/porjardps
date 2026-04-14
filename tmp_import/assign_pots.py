"""assign_pots.py — Update group_name (pot) di tournament_teams untuk FF Pria SMA & SMP."""
import psycopg2, psycopg2.extras, difflib

DB = dict(host="172.24.0.2", port=5432, dbname="porjar", user="porjar", password="o12S1kJiScjmejzPcIoAgyg9MUq9SD6f")

POTS_SMA = {
    "Tim 1": ["SMA NEGERI 3 DENPASAR B","SMK NEGERI 1 DENPASAR B","SMK BALI DEWATA A","SMK NEGERI 4 DENPASAR","SMA NEGERI 5 DENPASAR","SMA NEGERI 2 DENPASAR B","SMAS KATOLIK SANTO YOSEPH DENPASAR B","SMA DWIJENDRA DENPASAR B","SMAS KRISTEN HARAPAN B","SMK NEGERI 3 DENPASAR A"],
    "Tim 2": ["SMK PARIWISATA HARAPAN B","SMK TI BALI GLOBAL DENPASAR B","SMK NEGERI 2 DENPASAR B","SMK PGRI 1 DENPASAR","SMK PARIWISATA HARAPAN A","SMK PGRI 3 DENPASAR B","SMK BALI DEWATA B","SMK NEGERI 3 DENPASAR B","SMA NEGERI 9 DENPASAR A","SMAS KRISTEN HARAPAN A"],
    "Tim 3": ["SMA NEGERI 10 DENPASAR","SMK NEGERI 1 DENPASAR A","SMA MUHAMMADIYAH 1 DENPASAR B","SMK PGRI 3 DENPASAR A","SMA NEGERI 12 DENPASAR B","SMA NEGERI 7 DENPASAR B","SMK BINTANG PERSADA DENPASAR A","SMA NEGERI 12 DENPASAR A","SMA NEGERI 3 DENPASAR A","SMA MUHAMMADIYAH 1 DENPASAR A"],
    "Tim 4": ["SMK NEGERI 6 DENPASAR A","SMK PGRI 4 DENPASAR A","SMA NEGERI 11 DENPASAR","SMK KESEHATAN BALI MEDIKA DENPASAR","SMA NEGERI 1 DENPASAR A","SMA NEGERI 4 DENPASAR A","SMK NEGERI 7 DENPASAR","SMA DWIJENDRA DENPASAR A","SMAS KATOLIK SANTO YOSEPH DENPASAR A","SMA NEGERI 2 DENPASAR A"],
    "Tim 5": ["SMA NEGERI 7 DENPASAR A","SMK PGRI 4 DENPASAR B","SMA NEGERI 1 DENPASAR B","SMK TI BALI GLOBAL DENPASAR A","SMK NEGERI 5 DENPASAR","SMA NEGERI 6 DENPASAR A","SMA NEGERI 6 DENPASAR B","SMA NEGERI 9 DENPASAR B","SMA (SLUA) SARASWATI 1 DENPASAR","SMK TEKNOLOGI NASIONAL DENPASAR A"],
    "Tim 6": ["SMA TUNAS DAUD B","SMK BINTANG PERSADA DENPASAR B","SMK TEKNOLOGI NASIONAL DENPASAR B","SMA TUNAS DAUD A","SMA NEGERI 4 DENPASAR B","SMK NEGERI 6 DENPASAR B","SMA CHIS DENPASAR","SMA HARAPAN NUSANTARA B","SMK NEGERI 2 DENPASAR A"],
}

POTS_SMP = {
    "Tim 1": ["SMP NEGERI 13 DENPASAR B","MTS AL-MARUF B","SMP BINTANG PERSADA DENPASAR","SMP NEGERI 7 DENPASAR A","SMP NEGERI 6 DENPASAR B","SMP NEGERI 3 DENPASAR B","SMP PGRI 1 DENPASAR B","SMP NEGERI 12 DENPASAR A","SMP NEGERI 15 DENPASAR B","SMP PGRI 5 DENPASAR"],
    "Tim 2": ["SMP NEGERI 4 DENPASAR","SMP PGRI 8 DENPASAR A","SMP DHARMA PRAJA DENPASAR","SMP NEGERI 12 DENPASAR B","SMP DHARMA WIWEKA DENPASAR A","SMP PGRI 3 DENPASAR A","SMP WISATA SANUR A","MTS AL-MARUF A","SMPK TUNAS BANGSA","SMP NEGERI 15 DENPASAR A"],
    "Tim 3": ["SMP PGRI 2 DENPASAR","SMP CHIS DENPASAR","MTS AL MUHAJIRIN","SMPK 1 HARAPAN B","SMP NEGERI 17 DENPASAR A","SMP NEGERI 16 DENPASAR B","SMP NEGERI 5 DENPASAR A","SMP NEGERI 3 DENPASAR A","SMP NEGERI 9 DENPASAR A","SMP ANUGRAH A"],
    "Tim 4": ["SMP PGRI 3 DENPASAR B","SMP NEGERI 14 DENPASAR B","SMP GANESHA DENPASAR A","SMP NEGERI 16 DENPASAR A","SMP NEGERI 8 DENPASAR","SMP NEGERI 10 DENPASAR A","SMP CIPTA DHARMA DENPASAR","SMP DWIJENDRA DENPASAR","SMP NEGERI 2 DENPASAR","SMP NEGERI 9 DENPASAR B"],
    "Tim 5": ["SMP SAPTA ANDIKA DENPASAR A","SMP NEGERI 1 DENPASAR A","SMP NEGERI 6 DENPASAR A","SMP WISATA SANUR B","SMP NEGERI 14 DENPASAR A","SMPK 1 HARAPAN A","SMP PGRI 8 DENPASAR B","SMP PGRI 1 DENPASAR A","SMP NEGERI 1 DENPASAR B","SMP NEGERI 13 DENPASAR A"],
    "Tim 6": ["SMP GANESHA DENPASAR B","SMP SAPTA ANDIKA DENPASAR B","SMP SANTO YOSEPH DENPASAR","SMP MUHAMMADIYAH 1 DENPASAR","SMP WIDYA SAKTI DENPASAR","SMP NEGERI 7 DENPASAR B","SMP NEGERI 10 DENPASAR B","SMP NEGERI 5 DENPASAR B","SMP NEGERI 17 DENPASAR B","SMP DHARMA WIWEKA DENPASAR B"],
}

def normalize(s):
    return s.upper().strip()

def match_team(name, candidates):
    n = normalize(name)
    # Exact
    for tid, tname, tt_id in candidates:
        if normalize(tname) == n:
            return tid, tname, tt_id, 1.0
    # Fuzzy
    best, best_score = None, 0.0
    for tid, tname, tt_id in candidates:
        score = difflib.SequenceMatcher(None, n, normalize(tname)).ratio()
        if score > best_score:
            best_score = score
            best = (tid, tname, tt_id)
    if best and best_score >= 0.82:
        return best[0], best[1], best[2], best_score
    return None, None, None, 0.0

def assign_pots(cur, tournament_name, pots):
    cur.execute("""
        SELECT t.id, t.name, tt.id as tt_id
        FROM tournament_teams tt
        JOIN tournaments tr ON tr.id = tt.tournament_id
        JOIN teams t ON t.id = tt.team_id
        WHERE tr.name = %s AND tt.status = 'approved'
    """, (tournament_name,))
    candidates = [(r["id"], r["name"], r["tt_id"]) for r in cur.fetchall()]

    print(f"\n{'='*60}")
    print(f"  {tournament_name} ({len(candidates)} tim di DB)")
    print(f"{'='*60}")

    unmatched = []
    updated = 0
    for pot_name in sorted(pots):
        print(f"\n  [{pot_name}]")
        for team_name in pots[pot_name]:
            tid, matched_name, tt_id, score = match_team(team_name, candidates)
            if tt_id:
                label = "" if score == 1.0 else f" [fuzzy {score:.2f}]"
                print(f"    ✓ {team_name}{label}")
                if matched_name != team_name:
                    print(f"      → DB: {matched_name}")
                cur.execute("UPDATE tournament_teams SET group_name = %s WHERE id = %s", (pot_name, tt_id))
                updated += 1
            else:
                print(f"    ✗ UNMATCHED: {team_name}")
                unmatched.append(team_name)

    print(f"\n  Updated: {updated}, Unmatched: {len(unmatched)}")
    return unmatched

def main():
    conn = psycopg2.connect(**DB)
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    all_unmatched = []
    all_unmatched += assign_pots(cur, "PORJAR FREE FIRE SMA LAKI-LAKI 2026", POTS_SMA)
    all_unmatched += assign_pots(cur, "PORJAR FREE FIRE SMP LAKI-LAKI 2026", POTS_SMP)

    if all_unmatched:
        print(f"\n⚠ Total unmatched: {len(all_unmatched)}")
        for t in all_unmatched:
            print(f"  - {t}")
        confirm = input("\nAda yang unmatched. Commit tetap? (y/N): ").strip().lower()
    else:
        confirm = "y"

    if confirm == "y":
        conn.commit()
        print("\n✓ Committed.")
    else:
        conn.rollback()
        print("\n✗ Rolled back.")
    conn.close()

if __name__ == "__main__":
    main()
