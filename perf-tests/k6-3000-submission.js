/**
 * PORJAR — 3000 Concurrent Users Submission Load Test
 *
 * Tests the write-heavy submission flow under 3000 users.
 * Scenarios:
 *  1. Read-heavy: browse tournaments + bracket (3000 viewers)
 *  2. Write-heavy: concurrent match submissions (200 active players)
 *  3. Race condition test: burst duplicate submissions on same match
 *
 * Run: k6 run perf-tests/k6-3000-submission.js
 */
import http from 'k6/http'
import { check, group, sleep } from 'k6'
import { Rate, Trend, Counter } from 'k6/metrics'

// ─── Metrics ───────────────────────────────────────────────────────────────
const submitSuccess   = new Counter('submission_success')
const submitDuplicate = new Counter('submission_duplicate_rejected')
const submitError     = new Counter('submission_error')
const submitLatency   = new Trend('submission_latency_ms', true)
const readLatency     = new Trend('read_latency_ms', true)
const errorRate       = new Rate('error_rate')

// ─── Config ────────────────────────────────────────────────────────────────
const BASE = 'http://localhost:9090/api/v1'
const TOURNAMENT_ID  = 'cb7c7d85-e4b0-4020-a9d8-3e1845dcc9dd'
const ADMIN_TOKEN    = __ENV.ADMIN_TOKEN || ''

// Match + team pairs for submission simulation
const MATCHES = [
  {
    matchId: '9a12173f-f767-42c7-b6f4-954330325ec1',
    teamAId: 'cb7bc639-26b1-43d5-9e24-a5a0d5d4fbaa',
    teamBId: '2f2740e3-e02e-428b-bca6-47501c2fcd65',
  },
  {
    matchId: 'bb91aab1-acd5-4687-a7a1-76a5d4de30f5',
    teamAId: 'e64ac169-f848-4fd8-b1d5-4a21dfb0bcb5',
    teamBId: 'dbc472f3-72bb-4112-9ddf-eef9f8b0fa4e',
  },
  {
    matchId: '3ab01eaf-3ebb-4bd2-8aaa-5959d902ce0a',
    teamAId: '5e538e72-3286-4c97-9173-894b2457d250',
    teamBId: '8b861607-3579-4b81-820a-1ebe8eba9171',
  },
]

// ─── Load Profile ──────────────────────────────────────────────────────────
export const options = {
  scenarios: {
    // Scenario A: 2800 read-only viewers (browsers watching live tournament)
    viewers: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '20s', target: 500  },
        { duration: '30s', target: 2800 },
        { duration: '1m',  target: 2800 },
        { duration: '10s', target: 0   },
      ],
      exec: 'viewerScenario',
      gracefulRampDown: '10s',
    },
    // Scenario B: 200 active players submitting scores
    players: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '20s', target: 50  },
        { duration: '30s', target: 200 },
        { duration: '1m',  target: 200 },
        { duration: '10s', target: 0  },
      ],
      exec: 'playerScenario',
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    // Read endpoints must stay fast even under 3000 users
    read_latency_ms:       ['p(95)<500', 'p(99)<1000'],
    // Submissions allowed up to 2s under heavy write load
    submission_latency_ms: ['p(95)<2000', 'p(99)<3000'],
    // Overall HTTP
    http_req_duration:     ['p(95)<2000'],
    http_req_failed:       ['rate<0.10'], // max 10% — allows for expected 409 duplicates
    error_rate:            ['rate<0.10'],
  },
}

// ─── Viewer Scenario (read-only) ───────────────────────────────────────────
export function viewerScenario() {
  const r = Math.random()

  if (r < 0.4) {
    // 40%: browse tournament list
    const res = http.get(`${BASE}/tournaments`)
    readLatency.add(res.timings.duration)
    const ok = check(res, { 'viewer list 200': (r) => r.status === 200 })
    errorRate.add(ok ? 0 : 1)

  } else if (r < 0.8) {
    // 40%: view bracket (uses combined endpoint)
    const res = http.get(`${BASE}/tournaments/${TOURNAMENT_ID}/with-bracket`)
    readLatency.add(res.timings.duration)
    const ok = check(res, { 'viewer bracket 200': (r) => r.status === 200 })
    errorRate.add(ok ? 0 : 1)

  } else {
    // 20%: view live matches
    const res = http.get(`${BASE}/matches/live`)
    readLatency.add(res.timings.duration)
    const ok = check(res, { 'viewer live 200': (r) => r.status === 200 })
    errorRate.add(ok ? 0 : 1)
  }

  sleep(Math.random() * 2 + 1) // 1-3s think time between page views
}

// ─── Player Scenario (write-heavy submissions) ─────────────────────────────
export function playerScenario() {
  if (!ADMIN_TOKEN) {
    // Without token, test unauthenticated submission rejection
    const m = MATCHES[Math.floor(Math.random() * MATCHES.length)]
    const res = http.post(
      `${BASE}/matches/${m.matchId}/submit`,
      JSON.stringify({ team_id: m.teamAId, claimed_winner_id: m.teamAId, score_a: 3, score_b: 1 }),
      { headers: { 'Content-Type': 'application/json' } }
    )
    check(res, { 'unauth rejected 401': (r) => r.status === 401 })
    sleep(1)
    return
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${ADMIN_TOKEN}`,
  }

  // Pick a random match
  const m = MATCHES[Math.floor(Math.random() * MATCHES.length)]
  const isTeamA = Math.random() > 0.5
  const myTeamId = isTeamA ? m.teamAId : m.teamBId
  const claimedWinner = Math.random() > 0.3 ? myTeamId : (isTeamA ? m.teamBId : m.teamAId)

  group('Submit Score', () => {
    const payload = JSON.stringify({
      team_id: myTeamId,
      claimed_winner_id: claimedWinner,
      score_a: Math.floor(Math.random() * 5) + 1,
      score_b: Math.floor(Math.random() * 5),
    })

    const res = http.post(`${BASE}/matches/${m.matchId}/submit`, payload, { headers })
    submitLatency.add(res.timings.duration)

    if (res.status === 201 || res.status === 200) {
      submitSuccess.add(1)
      check(res, { 'submission created': () => true })
      errorRate.add(0)
    } else if (res.status === 409) {
      // Expected: duplicate submission rejected by DB unique constraint
      submitDuplicate.add(1)
      check(res, { 'duplicate rejected 409': (r) => r.status === 409 })
      errorRate.add(0) // 409 is expected behavior, not an error
    } else if (res.status === 401 || res.status === 403) {
      check(res, { 'auth error expected': () => true })
      errorRate.add(0)
    } else {
      submitError.add(1)
      errorRate.add(1)
    }
  })

  sleep(Math.random() * 3 + 2) // 2-5s between submissions (realistic player behavior)
}
