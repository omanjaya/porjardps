/**
 * PORJAR — Full Performance Test Suite
 * Run: k6 run perf-tests/k6-full.js
 *
 * NOTE: API rate limit is 100 req/min per IP (global).
 * To run this without hitting rate limits, set env var before starting API:
 *   RATE_LIMIT_GLOBAL=10000
 *
 * Or flush Redis between runs:
 *   docker exec porjar-redis redis-cli FLUSHDB
 *
 * This script tests real-world performance of critical endpoints.
 */
import http from 'k6/http'
import { check, group, sleep } from 'k6'
import { Rate, Trend, Counter } from 'k6/metrics'

// ─── Custom Metrics ────────────────────────────────────────────────────────
const errorRate      = new Rate('error_rate')
const tournamentList = new Trend('req_tournament_list_ms', true)
const withBracket    = new Trend('req_with_bracket_ms', true)
const bracketOnly    = new Trend('req_bracket_only_ms', true)
const liveMatches    = new Trend('req_live_matches_ms', true)
const apiErrors      = new Counter('api_errors')

// ─── Config ────────────────────────────────────────────────────────────────
const BASE = 'http://localhost:9090/api/v1'
const TOURNAMENT_BRACKET_ID = 'cb7c7d85-e4b0-4020-a9d8-3e1845dcc9dd' // ML Pria — 63 matches
const TOURNAMENT_BR_ID      = 'f9c71b4c-1ef1-48a6-acd1-666f8bcc1e1a' // Free Fire BR

// ─── Load Stages ───────────────────────────────────────────────────────────
// 20 VUs x 5 requests x ~2.6s per iter ≈ ~38 req/s — stays under 100/min per IP
export const options = {
  stages: [
    { duration: '15s', target: 5  }, // warm-up
    { duration: '30s', target: 20 }, // ramp up
    { duration: '1m',  target: 20 }, // sustain 20 concurrent users
    { duration: '15s', target: 50 }, // spike
    { duration: '30s', target: 50 }, // sustain spike
    { duration: '15s', target: 0  }, // ramp down
  ],
  thresholds: {
    http_req_duration:      ['p(95)<500', 'p(99)<1000'],
    http_req_failed:        ['rate<0.05'],
    error_rate:             ['rate<0.05'],

    req_tournament_list_ms: ['p(95)<200'],
    req_with_bracket_ms:    ['p(95)<400'],
    req_bracket_only_ms:    ['p(95)<350'],
    req_live_matches_ms:    ['p(95)<150'],
  },
}

// ─── Test Scenarios ────────────────────────────────────────────────────────
export default function () {
  group('1. Tournament List', () => {
    const res = http.get(`${BASE}/tournaments`)
    const ok = check(res, {
      'status 200':       (r) => r.status === 200,
      'has data':         (r) => r.status === 200 && JSON.parse(r.body).success === true,
      'response < 200ms': (r) => r.timings.duration < 200,
    })
    tournamentList.add(res.timings.duration)
    errorRate.add(res.status !== 200 ? 1 : 0)
    if (res.status !== 200) apiErrors.add(1)
  })

  sleep(0.5)

  group('2. Bracket Page — Combined Endpoint (2-in-1)', () => {
    const res = http.get(`${BASE}/tournaments/${TOURNAMENT_BRACKET_ID}/with-bracket`)
    const body = res.status === 200 ? JSON.parse(res.body) : {}
    const ok = check(res, {
      'status 200':       (r) => r.status === 200,
      'has tournament':   (r) => body.data?.tournament !== undefined,
      'has matches':      (r) => Array.isArray(body.data?.matches),
      'response < 400ms': (r) => r.timings.duration < 400,
    })
    withBracket.add(res.timings.duration)
    errorRate.add(res.status !== 200 ? 1 : 0)
    if (res.status !== 200) apiErrors.add(1)
  })

  sleep(0.5)

  group('3. Bracket Only (baseline comparison)', () => {
    const res = http.get(`${BASE}/tournaments/${TOURNAMENT_BRACKET_ID}/bracket`)
    check(res, {
      'status 200':       (r) => r.status === 200,
      'response < 350ms': (r) => r.timings.duration < 350,
    })
    bracketOnly.add(res.timings.duration)
    errorRate.add(res.status !== 200 ? 1 : 0)
  })

  sleep(0.5)

  group('4. Live Matches (single query fix)', () => {
    const res = http.get(`${BASE}/matches/live`)
    check(res, {
      'status 200':       (r) => r.status === 200,
      'response < 150ms': (r) => r.timings.duration < 150,
    })
    liveMatches.add(res.timings.duration)
    errorRate.add(res.status !== 200 ? 1 : 0)
  })

  sleep(1)
}
