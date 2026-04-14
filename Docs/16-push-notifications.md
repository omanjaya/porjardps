# Push Notifications

Web Push notification support for match schedules, results, and submission alerts.

## Architecture

- **Service Worker** (`public/sw.js`) — already handles `push` and `notificationclick` events
- **Client library** (`src/lib/pushNotifications.ts`) — subscription management, VAPID key fetch, permission requests
- **PushNotifyButton** (`src/components/shared/PushNotifyButton/`) — toggle button in Navbar/EventNavbar
- **PushOptIn** (`src/components/shared/PushOptIn/`) — opt-in banner on dashboard (auto-hides when subscribed or dismissed)
- **Profile page** (`src/app/dashboard/profile/page.tsx`) — on/off toggle switch

## Graceful Degradation

The entire push system is a **no-op** when:
- `VAPID_PUBLIC_KEY` is not configured on the backend (the `/push/vapid-public-key` endpoint returns empty)
- The browser doesn't support Push API or Service Workers (Safari < 16, etc.)
- The user denied notification permission

No errors are shown; components simply don't render.

## Setup

### 1. Generate VAPID Keys

```bash
npx web-push generate-vapid-keys
```

This outputs a public key and a private key.

### 2. Configure Backend

Set these environment variables on the Go API server:

| Variable | Description |
|----------|-------------|
| `VAPID_PUBLIC_KEY` | Base64url-encoded public key |
| `VAPID_PRIVATE_KEY` | Base64url-encoded private key |
| `VAPID_SUBJECT` | Contact URI, e.g. `mailto:admin@porjar.esidenpasar.com` |

### 3. Backend Endpoints Required

The frontend expects these API endpoints:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/push/vapid-public-key` | Returns `{ "public_key": "..." }` |
| POST | `/api/v1/push/subscribe` | Registers a push subscription. Body: `{ endpoint, keys: { p256dh, auth } }` |
| DELETE | `/api/v1/push/subscribe` | Removes a subscription. Body: `{ endpoint }` |

### 4. Sending Push Messages

From the backend, use the `web-push` protocol (RFC 8030) to send push messages. The payload should be JSON:

```json
{
  "title": "Hasil Pertandingan",
  "body": "Tim A vs Tim B — 2:1",
  "url": "/events/tournament-slug/bracket"
}
```

## Testing

1. Set up VAPID keys and backend endpoints
2. Open the dashboard — the PushOptIn banner should appear
3. Click "Aktifkan" — browser permission prompt appears
4. After granting, verify subscription via the bell icon in the navbar (should show filled/red)
5. Send a test push from the backend
6. Toggle off via Profile page or navbar bell icon

## User Flow

1. **Dashboard visit** — if not subscribed, a blue banner appears: "Aktifkan notifikasi"
2. **Click "Aktifkan"** — browser permission prompt
3. **Grant** — subscription created, sent to backend, toast confirmation
4. **Dismiss ("X")** — banner hidden for 7 days (localStorage: `push_optout_until`)
5. **Profile page** — toggle switch to enable/disable at any time
6. **Navbar bell** — quick toggle for power users

## Files

| File | Purpose |
|------|---------|
| `public/sw.js` | Push event handler (do not modify) |
| `src/lib/pushNotifications.ts` | Core push utilities |
| `src/hooks/usePushNotification.ts` | React hook (used by PushNotifyButton) |
| `src/components/shared/PushOptIn/index.tsx` | Dashboard opt-in banner |
| `src/components/shared/PushNotifyButton/index.tsx` | Navbar toggle button |
| `src/app/dashboard/profile/page.tsx` | Settings toggle |
