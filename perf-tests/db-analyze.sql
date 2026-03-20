-- ============================================================
-- PORJAR — Database Query Performance Analysis
-- Run: psql $DATABASE_URL -f perf-tests/db-analyze.sql
-- ============================================================

\echo '=== [1] INDEX USAGE — are our new indexes being used? ==='
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan      AS "times_used",
  idx_tup_read  AS "rows_read",
  idx_tup_fetch AS "rows_fetched"
FROM pg_stat_user_indexes
WHERE tablename IN ('bracket_matches', 'br_lobbies', 'tournament_teams', 'player_stats', 'standings')
ORDER BY tablename, idx_scan DESC;

\echo ''
\echo '=== [2] TABLE SEQ SCANS — high seq_scan = missing index ==='
SELECT
  relname        AS table_name,
  seq_scan,
  seq_tup_read,
  idx_scan,
  n_live_tup     AS row_count,
  CASE WHEN seq_scan > 0
    THEN round(100.0 * idx_scan / NULLIF(seq_scan + idx_scan, 0), 1)
    ELSE 100
  END AS index_hit_pct
FROM pg_stat_user_tables
WHERE relname IN ('bracket_matches', 'br_lobbies', 'tournament_teams', 'player_stats', 'users', 'teams', 'standings')
ORDER BY seq_scan DESC;

\echo ''
\echo '=== [3] EXPLAIN ANALYZE — tournament_list query ==='
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT t.*, g.name as game_name, g.slug as game_slug
FROM tournaments t
JOIN games g ON g.id = t.game_id
ORDER BY t.created_at DESC
LIMIT 20 OFFSET 0;

\echo ''
\echo '=== [4] EXPLAIN ANALYZE — bracket_matches with tournament + status filter ==='
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM bracket_matches
WHERE tournament_id = (SELECT id FROM tournaments LIMIT 1)
ORDER BY round, match_number;

\echo ''
\echo '=== [5] EXPLAIN ANALYZE — live matches query (was O(N), now single) ==='
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM bracket_matches
WHERE status = 'live'
ORDER BY updated_at DESC
LIMIT 100;

\echo ''
\echo '=== [6] EXPLAIN ANALYZE — standings recalculation (BR results JOIN) ==='
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT r.*, l.tournament_id
FROM br_lobby_results r
JOIN br_lobbies l ON l.id = r.lobby_id
WHERE l.tournament_id = (SELECT id FROM tournaments WHERE format = 'battle_royale_points' LIMIT 1);

\echo ''
\echo '=== [7] SLOW QUERIES — from pg_stat_statements (if enabled) ==='
SELECT
  round(mean_exec_time::numeric, 2) AS avg_ms,
  round(max_exec_time::numeric, 2)  AS max_ms,
  calls,
  round(total_exec_time::numeric, 2) AS total_ms,
  left(query, 120) AS query_snippet
FROM pg_stat_statements
WHERE mean_exec_time > 10
ORDER BY mean_exec_time DESC
LIMIT 20;
