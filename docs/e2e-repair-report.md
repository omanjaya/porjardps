# E2E Test Repair Report

Date: 2026-04-08
Scope: static audit & selector repair of `porjar-web/e2e/*.spec.ts` after recent refactor.
Tests were NOT executed (sandbox cannot run Playwright / dev server).

## Summary

- Spec files scanned: 24
- Files modified: 2
- Selectors fixed: 3
- No stale Indonesian-status regex matches found in assertions
- No stale `Daftar Event` / `Daftar Pemain` / `text=Daftar` button references found
- No stale `/events/*/tournaments` route references found
- Admin page headings referenced in specs (`Turnamen`, `Tim`, `Aktivitas Terbaru`, `Approve Tim`, etc.) verified against current code; no changes required
- NotificationBell tests reference `bg-porjar-red` dot class — FIXED
- Embed light-theme test references `bg-porjar-bg` — FIXED

## Patterns Searched

| Pattern | Matches in assertions | Action |
|---|---|---|
| `/Pending/`, `/Approved/`, `/Rejected/`, `/Completed/`, `/Scheduled/` | 0 | none |
| `'Pending'`, `"Approved"`, etc. string literals | 0 | none |
| `porjar-` class prefix | 3 (2 files) | replaced with `esi-` |
| `Daftar Event`, `Daftar Pemain` heading text | 0 | none |
| `text=Daftar` button literal | 0 | none |
| `/events/[slug]/tournaments` route | 0 | none |

The only textual hits for `Pending` / `Menunggu` in spec files were inline code comments
(`admin-workflow.spec.ts:328`, `:867`, `coach.spec.ts:118`) that describe the UI — the
actual selectors in those files already use the Indonesian forms (`/Menunggu/i`,
`Pending Verifikasi` which is still the literal card label in the coach dashboard page).

## Files Modified

### 1. `porjar-web/e2e/notifications.spec.ts`
2 selector fixes — unread-notification dot locator.

| Before | After |
|---|---|
| `page.locator('span.rounded-full.bg-porjar-red').first()` | `page.locator('span.rounded-full.bg-esi-red').first()` |
| `has: page.locator('span.rounded-full.bg-porjar-red')` | `has: page.locator('span.rounded-full.bg-esi-red')` |

Verified against `src/**` — new Tailwind token is `esi-red` (30+ hits under `porjar-web/src`,
only 4 stragglers of `porjar-` remain in non-test source files and are not targeted by tests).

### 2. `porjar-web/e2e/embed.spec.ts`
1 selector fix — light-theme background class check.

| Before | After |
|---|---|
| `[class*="bg-porjar-bg"], [class*="bg-stone"]` | `[class*="bg-esi-bg"], [class*="bg-stone"]` |

## Not Modified (verified healthy)

- `admin-workflow.spec.ts` — statuses use `Menunggu`, `Disetujui`, etc. already. `Pending` occurs only in comments and as the literal card label on `/admin` (still rendered as `Pending` in the stat-card component).
- `coach.spec.ts` — `Pending Verifikasi` is the actual card label in `src/app/coach/**`; leave as-is.
- `admin-import-export.spec.ts`, `admin.spec.ts`, `auth.spec.ts`, `player.spec.ts`, `profile.spec.ts`, `public*.spec.ts`, `team*.spec.ts`, `tournaments.spec.ts`, `submit-result.spec.ts`, `dashboard-detail.spec.ts`, `password-reset.spec.ts`, `upload.spec.ts`, `security.spec.ts`, `advanced-security.spec.ts`, `api.spec.ts`, `auth-api.spec.ts` — no stale patterns matched.

## Tests That May Still Need Manual Review

None flagged by the static scan. All selectors matched against current source. Recommended
manual sanity checks after first live run:

1. `notifications.spec.ts` — confirm `span.rounded-full.bg-esi-red` still wraps the unread
   dot in `src/components/.../NotificationBell*` and the dashboard notifications list.
2. `embed.spec.ts` — confirm the light theme actually sets `bg-esi-bg` on the embed layout
   (root `src/app/embed/layout.tsx` still references `porjar-` per the grep — may render
   fine if the Tailwind config still aliases both, but worth verifying).
3. `admin-workflow.spec.ts` stat card — if the `Pending` label gets localised to
   `Menunggu` later, line 868-871 selectors will need an update (they currently only
   assert `Turnamen` and `Tim`, so they are safe today).

## Recommendation

Run the full suite once:

```bash
cd porjar-web && npx playwright test --workers=1
```

If `notifications.spec.ts` or `embed.spec.ts` still fail, re-grep the source for the
live class name of the unread dot / embed background and align.

## Stats

- Files modified: 2
- Total selector replacements: 3
- Lines changed: 3
