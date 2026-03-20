# Shared Components — PORJAR Denpasar Esport

## Philosophy

Shared components are UI building blocks used across multiple modules. They are purely presentational — they receive data via props and emit events via callbacks. They have no knowledge of API calls, routing, or business logic.

All base components come from shadcn/ui (copy-pasted, fully owned). Shared app components are built on top of them. Module-specific components (bracket, battle royale, admin) live in `components/modules/`.

---

## Icon System

PORJAR uses **Phosphor Icons** as the primary icon set. Phosphor provides consistent, premium-quality icons in multiple weights (thin, light, regular, bold, fill, duotone) — no emoji anywhere in the UI.

```tsx
import { Trophy, GameController, Sword, Users, CalendarBlank } from '@phosphor-icons/react'

// Always specify weight explicitly
<Trophy size={20} weight="regular" />
<GameController size={16} weight="bold" />
```

Icon usage rules:

| Context | Weight | Size |
|---|---|---|
| Navigation sidebar | `regular` | 20 |
| Action buttons | `bold` | 16 |
| Dashboard stat cards | `duotone` | 32 |
| Empty states | `thin` | 48 |
| Game selector tabs | `fill` | 24 |
| Live score indicator | `fill` | 12 |

---

## Base UI Components (shadcn/ui)

Located at `components/ui/`. These are the raw building blocks:

- Button
- Input
- Select
- Textarea
- Badge
- Card
- Dialog
- Sheet
- Dropdown Menu
- Tooltip
- Tabs
- Table
- Separator
- Avatar
- Popover
- Scroll Area
- Skeleton
- Form (react-hook-form integration)

---

## Shared App Components

Located at `components/shared/`. Built on top of shadcn/ui.

---

### PageHeader

Used at the top of every page.

```tsx
interface PageHeaderProps {
    title: string
    description?: string
    actions?: React.ReactNode
    breadcrumbs?: { label: string; href?: string }[]
}
```

```tsx
<PageHeader
    title="Bracket Mobile Legends"
    description="Single Elimination - BO3"
    actions={
        <Button>
            <ArrowsClockwise size={16} weight="bold" />
            Generate Bracket
        </Button>
    }
/>
```

---

### GameSelector

Tab/pill navigation between the 5 games. Persistent across pages.

```tsx
interface GameSelectorProps {
    games: Game[]
    activeSlug: string
    onSelect: (slug: string) => void
    size?: 'sm' | 'md' | 'lg'
}
```

```tsx
<GameSelector
    games={games}
    activeSlug="ml"
    onSelect={(slug) => router.push(`/games/${slug}`)}
/>
```

Each game tab shows its icon and name. Active tab uses the game-specific accent color:
- HOK: amber
- ML: blue
- FF: orange
- PUBGM: yellow
- eFootball: green

---

### LiveBadge

Pulsing "LIVE" indicator for ongoing matches.

```tsx
interface LiveBadgeProps {
    size?: 'sm' | 'md'
}
```

Renders a red pulsing dot + "LIVE" text. Uses CSS animation for the pulse effect.

---

### CountdownTimer

Countdown to next scheduled match.

```tsx
interface CountdownTimerProps {
    targetDate: Date
    onComplete?: () => void
    label?: string
}
```

Displays `HH:MM:SS` countdown. Shows "Dimulai!" when reaching zero.

---

### SearchInput

Debounced search input.

```tsx
interface SearchInputProps {
    placeholder?: string
    onSearch: (query: string) => void
    debounce?: number   // ms, default 300
}
```

---

### EmptyState

Shown when a table or list has no data.

```tsx
interface EmptyStateProps {
    icon: React.ReactNode
    title: string
    description?: string
    action?: React.ReactNode
}
```

```tsx
<EmptyState
    icon={<Trophy size={48} weight="thin" className="text-slate-400" />}
    title="Belum ada turnamen"
    description="Buat turnamen pertama untuk memulai"
    action={<Button>Buat Turnamen</Button>}
/>
```

---

### ConfirmDialog

Reusable confirmation modal for destructive actions.

```tsx
interface ConfirmDialogProps {
    open: boolean
    title: string
    description: string
    confirmLabel?: string   // default "Hapus"
    variant?: 'destructive' | 'default'
    onConfirm: () => void
    onCancel: () => void
}
```

---

### StatusBadge

Color-coded badge for various status values across the platform.

```tsx
type StatusVariant =
    | 'pending' | 'approved' | 'rejected'    // team status
    | 'live' | 'completed' | 'scheduled'      // match status
    | 'upcoming' | 'ongoing' | 'cancelled'    // tournament status

interface StatusBadgeProps {
    status: StatusVariant
    label?: string   // override display text
}
```

Color mapping:

| Status | Color | Tailwind |
|---|---|---|
| `pending` | Amber | `bg-amber-500/20 text-amber-400` |
| `approved` / `active` | Green | `bg-green-500/20 text-green-400` |
| `rejected` / `eliminated` | Red | `bg-red-500/20 text-red-400` |
| `live` | Red (pulsing) | `bg-red-500/20 text-red-400 animate-pulse` |
| `completed` | Slate | `bg-slate-500/20 text-slate-400` |
| `scheduled` / `upcoming` | Blue | `bg-blue-500/20 text-blue-400` |
| `ongoing` | Cyan | `bg-cyan-500/20 text-cyan-400` |

---

### DataTable

Generic table component with sorting, filtering, and pagination.

```tsx
interface DataTableProps<T> {
    columns: ColumnDef<T>[]
    data: T[]
    pagination?: PaginationMeta
    onPageChange?: (page: number) => void
    loading?: boolean
    emptyMessage?: string
}
```

---

## Module-Specific Components

Located at `components/modules/`. These are feature-specific and may contain more complex rendering logic, but still receive data via props.

---

### BracketView

Interactive single/double elimination bracket (SVG-based).

```tsx
interface BracketViewProps {
    matches: BracketMatch[]
    rounds: number
    format: 'single_elimination' | 'double_elimination'
    onMatchClick?: (matchId: string) => void
    liveMatchIds?: string[]
    highlightTeamId?: string
}
```

Features:
- SVG rendering with zoom and pan (mouse drag + scroll wheel)
- Color coding: pending (slate), live (red glow), completed (green)
- Responsive: horizontal scroll on mobile
- Click match node to see detail modal
- Real-time updates via WebSocket (parent re-renders with new data)

---

### BRLeaderboard

Battle royale point leaderboard table.

```tsx
interface BRLeaderboardProps {
    standings: BRStanding[]
    lobbies: BRLobby[]
    expandable?: boolean   // show per-lobby breakdown
}
```

Features:
- Sortable columns (total points, kills, placement points)
- Per-lobby breakdown (expandable rows)
- Rank position with movement indicator (up/down arrows)
- Real-time update via WebSocket

---

### LiveScoreCard

Compact card showing a live match.

```tsx
interface LiveScoreCardProps {
    match: BracketMatch
    gameSlug: string
    bestOf: number
}
```

Shows: team logos, current score, game number in BO series, pulsing LIVE indicator.

---

### AdminScoreInput

Quick score input form for admin.

```tsx
interface AdminScoreInputProps {
    match: BracketMatch
    bestOf: number
    onSubmit: (score: ScorePayload) => void
}
```

For bracket matches: team selector + score per game + confirm before submit.

---

### BRResultInput

Bulk input form for battle royale lobby results.

```tsx
interface BRResultInputProps {
    lobby: BRLobby
    teams: Team[]
    onSubmit: (results: BRResultPayload[]) => void
}
```

Table with placement + kills input per team. Auto-calculates points preview before submit.

---

### ScheduleTimeline

Calendar/timeline view of matches.

```tsx
interface ScheduleTimelineProps {
    schedules: Schedule[]
    filterGame?: string
    highlightToday?: boolean
}
```

Features:
- Filter by game, date range
- "Hari Ini" highlighted
- Countdown to next match
- Color-coded by game

---

## Layout Components

### PublicLayout

Wraps all public-facing pages.

```
PublicLayout
├── Navbar (logo, game tabs, login/register)
├── Main content
└── Footer (Panitia info, Dispora Denpasar, social links)
```

### DashboardLayout

Wraps player dashboard pages (authenticated).

```
DashboardLayout
├── Navbar (user info, notifications)
├── Main content
└── (no sidebar — simple player dashboard)
```

### AdminLayout

Wraps admin pages.

```
AdminLayout
├── Sidebar (admin navigation)
├── TopNavbar (admin info, quick actions)
└── Main content area
```

---

## Component Rules

1. Shared components never import from `modules/` — dependencies flow one way
2. No API calls inside shared components — data always comes via props
3. All shared components are fully typed with TypeScript interfaces
4. Loading states handled via Skeleton variants where applicable
5. All interactive components support keyboard navigation
6. Dark theme is the default — all components designed for dark backgrounds
7. WebSocket data flows through parent components, not directly into shared components
