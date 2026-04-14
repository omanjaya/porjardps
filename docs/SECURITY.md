# PORJAR Security

## Hardening measures

### Authentication & Sessions
- JWT access tokens (2h) + refresh tokens (7d) in HttpOnly, Secure, SameSite=Strict cookies
- Bcrypt password hashing, lowercase requirement
- Refresh token blacklist via Redis on logout
- Reset tokens consumed before password update
- JWT role verified against DB (60s Redis cache)

### CSRF
- Double-submit cookie pattern on all mutations
- Exempt only on auth endpoints

### Rate limiting (per-IP, Redis with in-memory fallback)
- Global: `RATE_LIMIT_GLOBAL` (default 500/min)
- Login: per-IP 10/15min via `LoginRateLimiter`
- Per-endpoint limiters for register, forgot password, public APIs
- WebSocket: 20 connections/IP, 50 subscriptions/client

### Input validation
- Bounded pagination, kills/placement/URL limits
- Minimum search length
- URL sanitization helpers client-side

### IDOR / Access control
- Team membership verified on submissions
- Notification ownership checked
- Role-based middleware on admin routes

### Network & SSRF
- Webhook URL validation + DNS rebinding protection (custom DialContext)
- CORS allowlist via `CORS_ALLOWED_ORIGINS`

### Headers (API + Next.js)
- CSP, HSTS (`max-age=31536000; includeSubDomains`)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: camera=(), microphone=(), geolocation=()

### Files
- EXIF metadata stripped on upload
- 0o600 permissions
- MIME validation
- Max size enforced via `UPLOAD_MAX_SIZE`

### Database
- Transactions for multi-step writes (team creation)
- Batch queries (no N+1)
- Least-privilege DB user in prod

## Environment variable checklist (production)

Required in `.env.prod`:

- [ ] `APP_ENV=production`
- [ ] `APP_SECRET` — random, 32+ chars
- [ ] `JWT_SECRET` — random, **min 32 chars**
- [ ] `DB_PASSWORD` — strong random
- [ ] `REDIS_PASSWORD` — strong random
- [ ] `CORS_ALLOWED_ORIGINS=https://esidenpasar.com`
- [ ] `DB_SSL_MODE=require` (if DB is remote)
- [ ] `CENTRIFUGO_API_KEY` — random
- [ ] `VAPID_PRIVATE_KEY`, `VAPID_PUBLIC_KEY`
- [ ] `UPLOAD_BASE_URL=https://esidenpasar.com/uploads`
- [ ] `RATE_LIMIT_DISABLED=false`

**Never** commit `.env.prod`, `.env.prod.web`, `.env.centrifugo` (already in `.gitignore`).

## Incident response

1. **Suspected breach**
   - Rotate `JWT_SECRET` immediately (forces full logout of all users)
   - Rotate `DB_PASSWORD`, `REDIS_PASSWORD`, `CENTRIFUGO_API_KEY`
   - Redeploy: `./deploy.sh`
2. **Preserve evidence**
   - `docker logs porjar-api > incident_api.log`
   - `docker logs porjar-web > incident_web.log`
   - Snapshot DB: `./scripts/backup.sh`
3. **Contain**
   - Temporarily raise rate limits or block IPs at nginx/Caddy
   - Disable compromised accounts via admin panel
4. **Recover**
   - Restore from clean backup: `./scripts/restore.sh <file>`
   - Audit recent `audit_logs` table for suspicious actions
5. **Post-mortem**
   - Document timeline, root cause, and mitigations in `docs/incidents/`
   - Patch and redeploy

## Reporting

Security issues: security@esidenpasar.com (do not open public GitHub issues).
