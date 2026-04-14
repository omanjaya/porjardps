# Performance & Accessibility Audit — porjar-web

Date: 2026-04-08

## 1. Performance Findings

### next.config.ts
- `output: 'standalone'` — good for Docker
- `experimental.optimizePackageImports` already set for `@phosphor-icons/react` and `recharts` (tree-shaking enabled)
- `images`: AVIF/WebP formats, device/image sizes tuned, sensible `remotePatterns`
- `compress` not explicitly set — Next.js defaults to `true`, so OK
- No bundle analyzer configured. Consider `@next/bundle-analyzer` as a dev-only opt-in
- Security headers (CSP/HSTS/Frame-Options/etc.) set via `headers()`

### Image usage (`<img>` vs `next/image`)
- **22 files** still use raw `<img>` tags (counted via grep)
- Most are tiny game/school logos, submission screenshots, and print-only `MatchCard`
- High-visibility candidates migrated:
  - `app/dashboard/teams/[id]/page.tsx` — team logo
  - `app/schools/standings/page.tsx` — 3 school logos (table desktop + mobile + detail sheet)
- Not migrated (rationale):
  - `components/shared/MatchCard/index.tsx` — print-only PDF layout; Next/Image adds no value
  - Small game-logo chips (`h-3.5 w-3.5`) — local static assets, negligible
  - Admin submission lightboxes (internal tool, low traffic) — left as `<img>` but fixed a11y

### Icon imports
- `@phosphor-icons/react` is tree-shaken via `optimizePackageImports`
- No `lodash` imports found anywhere in `porjar-web/src`
- No barrel-import anti-patterns detected

### Lazy loading opportunities
- Heavy components not currently lazy-loaded:
  - `components/modules/bracket/*` (BracketView, MatchSubmissions, BracketControls, BracketMiniMap)
  - `recharts`-based analytics charts under `app/admin/`
  - `gsap` + `ScrollTrigger` in `schools/standings`
- Recommendation: wrap bracket view and admin charts with `next/dynamic({ ssr: false })`.

## 2. Accessibility Findings (counts)

| Issue | Count / status |
|---|---|
| `<img>` without `alt` | 0 (all have alt, though 18 files use `alt=""` for decorative logos — acceptable) |
| Icon-only buttons without `aria-label` | ~5 found in modal close / clear search buttons |
| `role="button"` on non-button | 0 |
| `aria-live` on announcement regions | 0 (AnnouncementBanner used `role="alert"` only) |
| Form `<input>` without label | Not exhaustively enumerated — forms generally use shadcn `<Label>` components |
| Color contrast `text-stone-400 on bg-stone-100` | Present in low-priority metadata; borderline but not primary text |
| Button focus ring | Global Button component has `focus-visible:ring-3 focus-visible:ring-ring/50` — OK |
| Keyboard navigation | Dropdowns/dialogs/sheets built on Base UI / Radix — handle Escape natively |

## 3. Fixes Applied

### Accessibility (10 fixes)
1. `app/admin/submissions/components/SubmissionLightbox.tsx` — added `role="dialog"`, `aria-modal`, `aria-label` on wrapper; `aria-label="Close preview"` on close button; focus ring.
2. `app/admin/submissions/components/SubmissionLightbox.tsx` — improved `alt` text on screenshot (was "Screenshot", now "Submission screenshot preview").
3. `components/modules/bracket/MatchSubmissions.tsx` — lightbox close button got `aria-label="Close preview"` + visible focus ring.
4. `components/modules/schedule/ScheduleDetailModal.tsx` — close button got `aria-label="Tutup detail jadwal"`.
5. `components/modules/bracket/BracketControls.tsx` — clear-search X button got `aria-label="Clear search"`.
6. `components/shared/AnnouncementBanner/index.tsx` — added `aria-live="polite"` to banner container so new announcements are announced to assistive tech.
7. `app/dashboard/teams/[id]/page.tsx` — team logo `alt=""` replaced with descriptive `${team.name} logo`.
8. `app/schools/standings/page.tsx` — school detail sheet logo `alt=""` replaced with `${selectedSchool.name} logo`.
9. `app/schools/standings/page.tsx` — desktop table logo alt improved to `${school.name} logo`.
10. `app/schools/standings/page.tsx` — mobile list logo alt improved to `${school.name} logo`.

### Performance / image migrations (img → next/image)
1. `app/dashboard/teams/[id]/page.tsx` — team logo.
2. `app/schools/standings/page.tsx` — desktop ranking table row.
3. `app/schools/standings/page.tsx` — mobile ranking row.
4. `app/schools/standings/page.tsx` — school detail sheet header.

All migrations use `unoptimized` (remote user-uploaded images served from backend) to preserve caching semantics while gaining the `<Image>` a11y/layout benefits.

### Verification
- `npx tsc --noEmit` — clean, 0 errors.

## 4. Recommendations

1. **Bundle analyzer** — add `@next/bundle-analyzer` behind `ANALYZE=true` env, run in CI periodically.
2. **Dynamic imports** — split bracket module and `recharts` admin dashboards via `next/dynamic`.
3. **Remaining `<img>` tags** — migrate the remaining ~18 files as each is touched. Consider creating a small `<SchoolLogo>` / `<GameLogo>` wrapper component using `next/image` to enforce consistency.
4. **Form labels** — run an automated axe-core scan on key pages (login, register, submit-result) to catch unlabeled inputs.
5. **Color contrast** — audit `text-stone-400 dark:text-zinc-500` used for metadata; meets 3:1 large-text AA but fails 4.5:1 small-text AA. Consider `text-stone-500` for body metadata.
6. **Keyboard focus trap** — verify admin submission lightbox traps focus (currently a plain div, not Radix Dialog).
7. **Event Settings dynamism** — move hardcoded PORJAR branding into the already-existing `/event-settings` loader so event-specific pages don't ship unused strings.
