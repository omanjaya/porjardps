# Monitoring & Observability

PORJAR ships a lightweight file-based observability stack — no Sentry, no GA.
Everything is stored as JSON lines on disk and can be reviewed with `grep`/`jq`.

## Health Endpoints

| Endpoint  | Purpose    | Expected | Checks            |
|-----------|------------|----------|-------------------|
| `/health` | Liveness   | `200`    | Server responding |
| `/ready`  | Readiness  | `200`    | DB + Redis reachable |

`/health` always returns `200` while the server is accepting connections (it
also reports `db`, `redis`, `ws_connections`, and `submission_queue_depth` in
the JSON body). `/ready` returns `503` if either PostgreSQL or Redis is
unreachable — this is the endpoint to use for load-balancer readiness probes.

## UptimeRobot Setup

1. Create a free UptimeRobot account: <https://uptimerobot.com>
2. Add **New Monitor** -> **HTTP(s)**
   - Friendly name: `PORJAR API - health`
   - URL: `https://porjar.esidenpasar.com/health`
   - Monitoring interval: `5 minutes`
3. Add a second monitor for `/ready` with the same settings.
4. **Alert Contacts**: add email (and optionally Telegram via the UptimeRobot
   Telegram bot) so the team is notified on downtime.
5. Response-code expectations: both endpoints must return `200`. UptimeRobot
   will mark the monitor as DOWN on any other status or a timeout >30s.

## Log Files (on the API container / VPS)

All logs live in `/app/storage/` inside the API container. They rotate daily
(renamed with a `.YYYY-MM-DD` suffix) and are kept for 7 days.

| File                | Content                                    |
|---------------------|--------------------------------------------|
| `errors.log`        | Server 5xx errors + panics (JSON lines)    |
| `client_errors.log` | Browser errors reported via `/errors/report` |
| `analytics.log`     | Anonymous page views (no IPs — hashed)     |

### How an admin reviews logs

```bash
# SSH into the VPS
ssh porjar-vps

# Tail the current error log
docker exec porjar-api tail -f /app/storage/errors.log

# Grep for 500s on a specific path
docker exec porjar-api grep '/api/v1/tournaments' /app/storage/errors.log | jq

# Today's page-view count
docker exec porjar-api wc -l /app/storage/analytics.log

# Top 10 paths today
docker exec porjar-api jq -r '.path' /app/storage/analytics.log | sort | uniq -c | sort -nr | head
```

### Rotation

Rotation happens lazily on the first write after midnight (UTC). Files older
than 7 days are deleted automatically. No cron job needed.

## Client-Side Error Reporting

`porjar-web/src/lib/errorReporter.ts` installs `window.onerror` and
`unhandledrejection` listeners and POSTs structured reports to
`POST /api/v1/errors/report`. The reporter is rate-limited to 10 reports per
minute per browser session and uses `navigator.sendBeacon` where available so
reports survive page navigations.

## Privacy-Friendly Analytics

`porjar-web/src/lib/analytics.ts` fires on every client-side navigation via
`ObservabilityInit` in the root layout. It sends `{path, referrer, user_agent,
timestamp}` to `POST /api/v1/analytics/pageview`. The server never stores the
raw IP — it is hashed with a salt before being written.

### Opt-out

Users can opt out by running this in the browser console:

```js
localStorage.setItem('analytics_optout', '1');
```

## Dashboards

There is no web dashboard for these log files — they are intentionally simple
and grep-friendly. For numeric metrics (request rates, DB pool, queue depth)
the API exposes a Prometheus endpoint at `/metrics` (internal network only);
point Grafana at it if you want graphs.
