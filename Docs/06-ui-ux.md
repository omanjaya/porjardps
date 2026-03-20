# UI/UX Design — PORJAR Denpasar Esport

## Design Philosophy

- Dark, energetic, gaming aesthetic — not corporate
- Data-dense without feeling cluttered
- Real-time feel: live indicators, animations, WebSocket updates
- Consistent visual hierarchy across all pages
- Mobile-first — majority of users access via smartphone
- No emoji anywhere — use Phosphor Icons exclusively

---

## Design System

### Color Palette

```
Background       #0F172A  (slate-900)       -- page background
Background Alt   #1E293B  (slate-800)       -- card backgrounds, sidebar
Surface          #334155  (slate-700)       -- elevated surfaces, inputs
Border           #475569  (slate-600)       -- dividers, card borders
Border Subtle    #334155  (slate-700)       -- subtle separators

Primary          #3B82F6  (blue-500)        -- actions, links, highlights
Primary Hover    #2563EB  (blue-600)        -- hover states
Primary Muted    #3B82F6/20                 -- badges, subtle highlights

Success          #22C55E  (green-500)       -- approved, won, completed
Warning          #F59E0B  (amber-500)       -- pending, caution
Danger           #EF4444  (red-500)         -- rejected, eliminated, live
Info             #06B6D4  (cyan-500)        -- informational

Text Primary     #F8FAFC  (slate-50)        -- headings, primary text
Text Secondary   #94A3B8  (slate-400)       -- body text, descriptions
Text Muted       #64748B  (slate-500)       -- labels, placeholders
```

### Game-Specific Accent Colors

Each game has a unique accent color used in tabs, borders, and highlights:

```
HOK        #F59E0B  (amber-500)     -- Gold/amber
ML         #3B82F6  (blue-500)      -- Blue
FF         #F97316  (orange-500)    -- Orange
PUBGM      #EAB308  (yellow-500)    -- Yellow
eFootball   #22C55E  (green-500)     -- Green
```

---

### Typography

```
Font: Inter (Google Fonts)

Heading 1   : 28px / 700 / slate-50     -- page titles
Heading 2   : 22px / 600 / slate-50     -- section titles
Heading 3   : 18px / 600 / slate-100    -- card titles, subsections
Body        : 14px / 400 / slate-300    -- general text
Body Small  : 13px / 400 / slate-400    -- secondary text
Label       : 12px / 500 / slate-500 / uppercase tracking-wide
Score       : 32px / 800 / slate-50     -- live score display (tabular-nums)
```

---

### Spacing

Uses Tailwind's default 4px base unit:

```
xs   : 4px   (p-1)
sm   : 8px   (p-2)
md   : 16px  (p-4)
lg   : 24px  (p-6)
xl   : 32px  (p-8)
2xl  : 48px  (p-12)
```

---

### Border Radius

```
Small   : 6px    (rounded)      -- badges, inputs
Medium  : 8px    (rounded-lg)   -- cards, buttons
Large   : 12px   (rounded-xl)   -- modals, panels
```

---

### Card Style

All cards use a consistent dark glass-morphism style:

```css
background: rgba(30, 41, 59, 0.8);    /* slate-800 with opacity */
border: 1px solid rgba(71, 85, 105, 0.5);  /* slate-600 subtle */
border-radius: 12px;
backdrop-filter: blur(8px);
```

Live match cards add a subtle glow:

```css
box-shadow: 0 0 20px rgba(239, 68, 68, 0.15);  /* red glow for live */
border-color: rgba(239, 68, 68, 0.3);
```

---

## Layout Structure

### Public Layout (Landing, Games, Bracket, Standings)

```
+--------------------------------------------------+
|  [Logo]  HOK  ML  FF  PUBGM  eFB   [Login] [Daftar] |
+--------------------------------------------------+
|                                                  |
|              Main Content Area                   |
|              (full width, responsive)            |
|                                                  |
+--------------------------------------------------+
|  Footer: Panitia Porjar Denpasar | Dispora      |
+--------------------------------------------------+
```

### Admin Layout

```
+--------------------------------------------------+
|  [Logo]           [Admin Name] [Notifications]   |
+----------+---------------------------------------+
|          |                                       |
| Sidebar  |   Main Content Area                   |
| (240px)  |                                       |
|          |   Page Header                         |
| Turnamen |   ----------------------------------- |
| Tim      |   Content                             |
| Jadwal   |   (DataTable / Forms / Bracket)       |
| Sekolah  |                                       |
| Pengguna |                                       |
| Live     |                                       |
|          |                                       |
+----------+---------------------------------------+
```

### Admin Sidebar Navigation

- Dashboard
- Turnamen (Kelola turnamen, bracket, lobby)
- Tim (Approval, manajemen)
- Jadwal (Schedule management)
- Sekolah (School data)
- Pengguna (User management)
- Live Score (Quick score input panel)

---

## Key Pages

### Landing Page

```
+--------------------------------------------------+
|                                                  |
|     PORJAR DENPASAR ESPORT 2026                  |
|     Pekan Olahraga Pelajar Kota Denpasar         |
|                                                  |
|     [Daftar Sekarang]    [Lihat Bracket]          |
|                                                  |
|     (animated particles / gradient background)    |
+--------------------------------------------------+

+--------+--------+--------+--------+--------+
| [HOK]  | [ML]   | [FF]   | [PUBGM]| [eFB]  |
| icon   | icon   | icon   | icon   | icon   |
| 16 tim | 24 tim | 12 tim | 16 tim | 8 pmn  |
+--------+--------+--------+--------+--------+

+--------------------------------------------------+
| PERTANDINGAN LIVE                    [Lihat Semua]|
|                                                  |
| +---------------------+ +---------------------+ |
| | SMAN 1  [2] vs [1]  | | SMKN 3  [0] vs [1] | |
| | SMAN 4    ML - BO3   | | SMAN 7    HOK - BO3 | |
| | * LIVE  Game 3       | | * LIVE  Game 2      | |
| +---------------------+ +---------------------+ |
+--------------------------------------------------+

+--------------------------------------------------+
| JADWAL MENDATANG                                  |
|                                                  |
| Hari Ini, 16 Mar 2026                            |
| 14:00  ML  SMAN 2 vs SMAN 5        Semifinal     |
| 15:30  HOK SMKN 1 vs SMA Dwijendra  Quarter       |
|                                                  |
| Besok, 17 Mar 2026                               |
| 10:00  FF  Lobby 3 Day 2            12 tim       |
| 13:00  PUBGM Lobby 2 Day 3          16 tim       |
+--------------------------------------------------+

+--------------------------------------------------+
| HASIL TERBARU                                    |
|                                                  |
| SMAN 1 [2-1] SMAN 6     ML   Semifinal          |
| SMKN 2 [0-2] SMA Harapan HOK  Quarter           |
+--------------------------------------------------+
```

---

### Bracket View Page (`/tournaments/[id]/bracket`)

```
Page Header: "Mobile Legends - Single Elimination"

[Zoom +] [Zoom -] [Reset]  [Cari Tim...]

+--------------------------------------------------+
|                                                  |
|  Round 1        Quarter       Semi      Final    |
|                                                  |
|  SMAN 1 [2]  ─┐                                 |
|               ├─ SMAN 1 [2] ─┐                  |
|  SMAN 8 [0]  ─┘              │                  |
|                               ├─ SMAN 1 [2] ─┐  |
|  SMAN 4 [2]  ─┐              │               │  |
|               ├─ SMAN 5 [1] ─┘               │  |
|  SMAN 5 [1]  ─┘                              │  |
|                                               ├─ |
|  SMAN 2 [2]  ─┐                              │  |
|               ├─ SMAN 2 [0] ─┐               │  |
|  SMAN 7 [0]  ─┘              │               │  |
|                               ├─ SMKN 3 [?] ─┘  |
|  SMKN 3 [2]  ─┐              │                  |
|               ├─ SMKN 3 [2] ─┘                  |
|  SMAN 6 [1]  ─┘                                 |
|                                                  |
+--------------------------------------------------+

Color coding:
  Slate border   = pending
  Red glow       = LIVE
  Green border   = completed
  Blue highlight  = selected/hover
```

---

### Battle Royale Leaderboard (`/tournaments/[id]/standings`)

```
Page Header: "Free Fire - Klasemen Keseluruhan"

[Lobby 1] [Lobby 2] [Lobby 3] [Keseluruhan]

+------+------------------+--------+-------+-----------+-------+
| Rank | Tim              | Poin   | Kills | Placement | Avg   |
+------+------------------+--------+-------+-----------+-------+
|  1   | SMAN 1 Denpasar  | 87     | 32    | 55        | 2.3   |
|  2   | SMKN 3 Denpasar  | 79     | 28    | 51        | 3.1   |
|  3   | SMA Dwijendra    | 71     | 24    | 47        | 3.8   |
|  4   | SMAN 4 Denpasar  | 65     | 21    | 44        | 4.2   |
|  ...                                                         |
+------+------------------+--------+-------+-----------+-------+

Expandable row (click to see per-lobby breakdown):
  SMAN 1 Denpasar
  ├── Lobby 1: #1 (15 pts) + 8 kills = 23 pts
  ├── Lobby 2: #2 (12 pts) + 11 kills = 23 pts
  ├── Lobby 3: #1 (15 pts) + 5 kills = 20 pts
  └── Lobby 4: #3 (10 pts) + 8 kills = 18 pts
```

---

### Live Score Card (Component)

```
+-------------------------------------------+
|  * LIVE                          Game 2/3 |
|                                           |
|  [logo] SMAN 1 Denpasar                  |
|              2                            |
|          ─────────                        |
|              1                            |
|  [logo] SMAN 4 Denpasar                  |
|                                           |
|  Mobile Legends  |  Semifinal             |
+-------------------------------------------+
```

---

### Admin Live Score Input (`/admin/live`)

```
Page Header: "Input Score Live"

[Bracket Match] [Battle Royale Lobby]

--- Bracket Match Tab ---

Pertandingan Aktif:
+--------------------------------------------------+
| ML - Semifinal 1                                 |
| SMAN 1 vs SMAN 4                    Status: LIVE |
|                                                  |
| Game 1:  SMAN 1 [13] - [8] SMAN 4    W: SMAN 1  |
| Game 2:  SMAN 1 [_]  - [_] SMAN 4    (input)    |
|                                                  |
|  Team A Score: [___]    Team B Score: [___]       |
|  Pemenang Game: ( ) SMAN 1  ( ) SMAN 4           |
|                                                  |
|  [Simpan Score Game]                              |
|                                                  |
|  [Selesaikan Pertandingan]  <- only when series decided |
+--------------------------------------------------+

--- Battle Royale Lobby Tab ---

Lobby Aktif: FF Lobby 3 Day 2
+------+------------------+-----------+-------+--------+
| No   | Tim              | Placement | Kills | Points |
+------+------------------+-----------+-------+--------+
|  1   | SMAN 1 Denpasar  | [__]      | [__]  | auto   |
|  2   | SMKN 3 Denpasar  | [__]      | [__]  | auto   |
|  3   | SMA Dwijendra    | [__]      | [__]  | auto   |
|  ...                                                  |
+------+------------------+-----------+-------+--------+

[Preview Kalkulasi]   [Simpan Hasil Lobby]
```

---

### Team Registration Flow

```
Step 1: Register Account
+--------------------------------------------------+
| Daftar Akun                                      |
|                                                  |
| Nama Lengkap *    [_________________________]    |
| Email *           [_________________________]    |
| No. HP *          [_________________________]    |
| Password *        [_________________________]    |
| Konfirmasi *      [_________________________]    |
|                                                  |
|                [Daftar]                           |
+--------------------------------------------------+

Step 2: Create Team (after login)
+--------------------------------------------------+
| Buat Tim Baru                                    |
|                                                  |
| Nama Tim *        [_________________________]    |
| Game *            [v Mobile Legends           ]  |
| Sekolah *         [v SMA Negeri 1 Denpasar    ]  |
|                                                  |
|                [Buat Tim]                         |
+--------------------------------------------------+

Step 3: Add Members
+--------------------------------------------------+
| Anggota Tim - SMAN 1 Warriors (ML)               |
|                                                  |
| [Captain] Budi S.  - IGN: BudiML  - ID: 12345   |
|                                                  |
| Tambah Anggota:                                  |
| In-Game Name *    [_________________________]    |
| In-Game ID        [_________________________]    |
| Role *            [v Member                   ]  |
|                                                  |
|                [Tambah]                           |
|                                                  |
| Anggota (3/5):                                   |
| 1. Budi S.    Captain   BudiML                   |
| 2. Agus W.    Member    AgusGG                   |
| 3. Dewa P.    Member    DewaPro                  |
|                                                  |
| Status Tim: Menunggu Approval                    |
+--------------------------------------------------+

Step 4: Register to Tournament
+--------------------------------------------------+
| Daftar Turnamen                                  |
|                                                  |
| Turnamen: ML Single Elimination - Porjar 2026    |
| Tim: SMAN 1 Warriors                            |
| Anggota: 5/5 (memenuhi syarat)                   |
|                                                  |
| [Daftarkan Tim]                                  |
+--------------------------------------------------+
```

---

## Responsive Behavior

| Breakpoint | Navbar | Sidebar (Admin) | Content |
|---|---|---|---|
| Desktop (1280+) | Full game tabs | Fixed, 240px | Full width |
| Tablet (768-1279) | Hamburger + game icons | Collapsible, icon only | Full width |
| Mobile (<768) | Hamburger only | Hidden, toggle overlay | Full width, card stack |

### Bracket on Mobile

- Horizontal scroll for bracket view
- Pinch-to-zoom on touch devices
- Match nodes minimum 120px wide for tap targets
- Alternative: list view mode for small screens

---

## Micro-interactions

- Live match cards pulse with red glow
- Score updates animate (number transition)
- Bracket advancement shows brief animation (line drawing)
- Table rows highlight on hover with game accent color
- Form validation inline (not on submit)
- Confirm dialog before any score submission
- Toast notifications for success/error (top-right, 3s auto-dismiss)
- Skeleton loaders on all data-fetching components
- WebSocket connection status indicator (top bar, subtle)

---

## Empty States

Each empty state uses Phosphor Icons (thin weight, 48px, slate-500):

```
        [Trophy icon -- thin, 48px, slate-500]

           Belum ada turnamen aktif

   Turnamen akan ditampilkan saat panitia
   membuka pendaftaran

              [Lihat Semua Game]
```

```
        [Sword icon -- thin, 48px, slate-500]

           Belum ada pertandingan live

   Kembali lagi nanti saat pertandingan dimulai
```

```
        [UsersThree icon -- thin, 48px, slate-500]

           Tim belum memiliki anggota

   Tambahkan anggota untuk memenuhi
   syarat pendaftaran turnamen

              [Tambah Anggota]
```
