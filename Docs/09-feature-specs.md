# Feature Specifications — PORJAR Denpasar Esport

## How to Read This Document

Each feature includes:
- **User Story**: who needs it and why
- **Acceptance Criteria**: what done looks like (testable)
- **Edge Cases**: situations that must not break the system
- **Role Access**: who can do what
- **Out of Scope**: what this feature intentionally does not do

---

## F-01: User Registration & Authentication

**User Story**
As a player, I want to register an account and log in so I can create a team and participate in tournaments.

**Acceptance Criteria**
- User can register with email, password, full name, phone
- User can log in with email + password
- Invalid credentials return a clear error message (not which field is wrong)
- After login, player is redirected to player dashboard
- Admin/superadmin redirected to admin dashboard
- Access token expires after 15 minutes
- Refresh token silently renews access token without re-login
- Refresh token expires after 7 days of inactivity
- After 5 failed login attempts, account is locked for 15 minutes
- Logout invalidates the refresh token server-side
- User can update their profile (name, phone, avatar)
- Password reset via email link

**Edge Cases**
- User logs in on two devices simultaneously — both sessions valid
- Refresh token used after logout — must be rejected
- Access token tampered — must fail signature validation
- User account role changed while logged in — next request reflects new role
- Email already registered — show conflict error, do not create
- Weak password — show validation error with specific requirement

**Role Access**
- Register: public
- Login: all roles
- Profile update: own profile only

**Out of Scope**
- Google/OAuth login (future)
- 2FA (future)
- Email verification on registration (future)

---

## F-02: Team Management

**User Story**
As a player, I want to create a team, add members, and manage my team so we can register for tournaments.

**Acceptance Criteria**
- Player creates team by selecting game + school + team name
- Creator auto-becomes captain
- Captain can add/remove members by inviting registered users
- Each member provides in-game name + in-game ID
- Team must meet minimum member count for the game before registering to tournament
- Substitute slots available as defined per game
- Team shows status: pending -> approved (after admin review)
- Captain can update team name and logo
- Player can view all their teams across games

**Edge Cases**
- User tries to join two teams for the same game — blocked
- Captain removes themselves — blocked (must transfer captaincy first or delete team)
- Team with max members tries to add more — show clear error
- Adding member after tournament registration — blocked (admin exception)
- School not in list — player must contact admin to add school

**Role Access**
- Create team: `player`
- Add/remove members: `captain` of team
- Update team info: `captain`, `admin`
- View team detail: public
- Delete team: `captain` (if not in tournament), `admin`

**Out of Scope**
- Team invite system via link/code (V2 — currently captain manually adds by user ID)
- Team chat (out of scope)

---

## F-03: Team Approval

**User Story**
As an admin, I want to review and approve team registrations so only legitimate teams can participate.

**Acceptance Criteria**
- Admin sees list of pending teams with school, game, member count, captain info
- Admin can approve or reject a team with optional reason
- Rejected teams get a reason message visible in their dashboard
- Approved teams can register to tournaments
- Admin can filter teams by game, status, school

**Edge Cases**
- Team approved but later found to have invalid members — admin can change status back to rejected
- Bulk approval — admin can select multiple teams and approve at once
- Team with insufficient members — show warning but allow approval (captain must fill before tournament registration)

**Role Access**
- Approve/reject: `admin`, `superadmin`
- View pending list: `admin`, `superadmin`

---

## F-04: Tournament Management

**User Story**
As an admin, I want to create and manage tournaments so each game has a structured competition with clear rules and format.

**Acceptance Criteria**
- Admin creates tournament: select game, format, stage, best_of, dates, rules
- Tournament status lifecycle: upcoming -> registration -> ongoing -> completed
- Admin can set registration period (start + end dates)
- Admin can set max teams
- Teams register during registration period (captain action)
- Admin can view all registered teams per tournament
- Admin can change tournament status manually
- Admin can edit tournament details until it starts

**Edge Cases**
- Admin creates two tournaments for the same game — allowed (e.g., qualifier + main bracket)
- Registration end date passes but status not changed — auto-close registration via cron or manual
- Tournament with 0 registered teams — can be cancelled, not started
- Admin tries to start tournament with only 1 team — blocked
- Changing format after bracket generation — blocked (must delete bracket first)

**Role Access**
- Create/edit/delete tournament: `admin`, `superadmin`
- Register team: `player` (captain)
- View tournaments: public

**Out of Scope**
- Swiss format implementation (V2)
- Group stage + playoff bracket linking (V2 — manual for now)

---

## F-05: Bracket System (HOK, ML, eFootball)

**User Story**
As an admin, I want to generate and manage tournament brackets so matches are organized and results advance automatically.

**Acceptance Criteria**
- Admin triggers bracket generation after registration closes
- System generates bracket based on format (single/double elimination)
- Seeding: admin can set manual seeds or use random seeding
- BYE matches auto-advance if team count is not a power of 2
- Each bracket match shows: team A, team B, score, status, scheduled time
- Admin can schedule each match (date + time)
- Bracket is viewable as interactive SVG on public page
- Click any match to see detail (BO series scores, MVPs)

**Edge Cases**
- Odd number of teams — BYEs placed correctly (highest seeds get BYEs)
- Team withdraws after bracket generated — admin sets match as BYE, opponent advances
- Double elimination: loser bracket correctly linked
- Admin generates bracket twice — blocked, must delete first
- 2-team tournament — single match final
- 32+ teams — bracket still renders correctly with scroll

**Role Access**
- Generate/manage bracket: `admin`, `superadmin`
- View bracket: public
- Input scores: `admin`, `superadmin`

---

## F-06: Live Score Input & Broadcasting

**User Story**
As an admin, I want to input match scores in real-time so spectators can follow live results via the website.

**Acceptance Criteria**
- Admin opens "Live Score" panel in admin dashboard
- Admin selects active match and sets status to "live"
- All connected viewers see "LIVE" indicator on the match
- Admin inputs score per game in BO series (e.g., Game 1: 13-8, Game 2: 10-15)
- Score updates broadcast instantly to all WebSocket subscribers
- Admin marks match as complete — winner auto-advances in bracket
- Standings auto-update after match completion
- For BR: admin inputs placement + kills per team per lobby
- BR leaderboard updates in real-time

**Edge Cases**
- WebSocket disconnects — client auto-reconnects, fetches latest state via REST fallback
- Two admins input scores for the same match — last write wins (show warning)
- Admin inputs wrong score — can edit while match is live, cannot edit after completion without reset
- Network latency — optimistic UI update on admin side, confirmed after server response
- Large number of concurrent viewers (1000+) — WebSocket hub handles fan-out efficiently

**Role Access**
- Input scores: `admin`, `superadmin`
- View live scores: public (no auth required for WebSocket)

**Out of Scope**
- Automatic score detection from game APIs (manual input only)
- Video/stream embedding in match detail

---

## F-07: Battle Royale Point System (FF, PUBGM)

**User Story**
As an admin, I want to manage battle royale lobbies and calculate points so the leaderboard accurately reflects team performance across multiple matches.

**Acceptance Criteria**
- Admin creates lobbies with room ID + password + schedule
- Room credentials visible only to registered teams
- Admin inputs placement + kills per team after each lobby
- System auto-calculates: placement points (from point rules) + kill points
- Cumulative leaderboard shows total points across all lobbies
- Leaderboard sortable by total points, kills, placement points
- Per-lobby breakdown available (expandable rows)
- Real-time leaderboard update via WebSocket

**Edge Cases**
- Team disconnects mid-match — admin inputs their last known placement
- Team does not show up — admin can assign last place or mark as DNS (did not start)
- Tied total points — tiebreaker: total kills > best single placement > head-to-head
- Point rules change mid-tournament — admin can recalculate all lobbies with new rules
- Lobby with missing results — partial results allowed, leaderboard shows warning

**Role Access**
- Create/manage lobbies: `admin`, `superadmin`
- Input results: `admin`, `superadmin`
- View leaderboard: public
- View room credentials: registered teams only

---

## F-08: Standings & Leaderboard

**User Story**
As a spectator, I want to see tournament standings so I can track which teams are performing best.

**Acceptance Criteria**
- Bracket tournaments: standings show W/L record, rounds won/lost
- BR tournaments: standings show total points, kills, placement points, best placement, avg placement
- Standings update automatically after each match/lobby completion
- Rank position clearly displayed (1st, 2nd, 3rd, etc.)
- Eliminated teams marked with visual indicator
- Standings page accessible from tournament detail and game page

**Edge Cases**
- No matches played yet — show all teams at rank 0 or "Belum ada hasil"
- Tournament with group stage — standings shown per group
- Multiple tournaments for same game — each has independent standings

**Role Access**
- View: public

---

## F-09: Schedule Management

**User Story**
As a spectator, I want to see the match schedule so I know when to watch.

**Acceptance Criteria**
- Admin creates schedule entries linked to bracket matches or BR lobbies
- Schedule shows: date/time, teams involved, game, tournament stage, venue
- Public schedule page with filter by game and date
- "Hari Ini" and "Mendatang" views
- Countdown timer to next match on landing page
- Schedule synced with match status (upcoming -> ongoing -> completed)

**Edge Cases**
- Match postponed — admin updates schedule, status shows "Ditunda"
- No upcoming matches — show empty state
- Multiple matches at same time — all shown, sorted by game

**Role Access**
- Create/edit/delete: `admin`, `superadmin`
- View: public

---

## F-10: Admin Dashboard

**User Story**
As an admin, I want an overview dashboard so I can quickly see tournament status, pending actions, and live matches.

**Acceptance Criteria**
- Stat cards: total teams, pending approvals, active tournaments, live matches
- Quick actions: approve teams, input scores, manage schedule
- Live matches widget with direct link to score input
- Recent activity log (last 10 actions)
- Per-game tournament status summary

**Edge Cases**
- No active tournaments — dashboard shows "Belum ada turnamen aktif"
- All teams approved — pending count shows 0

**Role Access**
- View: `admin`, `superadmin`

---

## F-11: Player Dashboard

**User Story**
As a player, I want a personal dashboard so I can manage my teams and see my tournament status.

**Acceptance Criteria**
- Overview: my teams list, upcoming matches, team status
- Create new team flow
- Manage existing team (add members, update info)
- Register team to tournament
- View match history and results
- Edit profile

**Edge Cases**
- Player with no teams — show "Buat Tim Pertama" CTA
- Team rejected — show rejection reason and option to re-submit
- Tournament registration closed — disable register button, show "Pendaftaran Ditutup"

**Role Access**
- View: `player` (own data only)

---

## F-12: School Management

**User Story**
As an admin, I want to manage the list of schools so teams can be correctly associated with their institutions.

**Acceptance Criteria**
- Admin can add, edit schools (name, level, address)
- School list used in team creation dropdown
- Filter schools by level (SMP, SMA, SMK)
- Seed data includes all Denpasar public and major private schools

**Edge Cases**
- School name duplicate — warn but allow (different branches)
- Deleting school with existing teams — blocked

**Role Access**
- CRUD: `admin`, `superadmin`

---

## F-13: User Management (Admin)

**User Story**
As a superadmin, I want to manage user roles so I can grant admin access to panitia members.

**Acceptance Criteria**
- Superadmin can view all users with search and filter
- Superadmin can change user role (player -> admin)
- Superadmin can disable user accounts
- List shows: name, email, role, registration date, last login

**Edge Cases**
- Superadmin tries to demote the only superadmin — blocked
- Admin changes own role — blocked

**Role Access**
- User management: `superadmin` only

---

## F-14: Landing Page (Public)

**User Story**
As a visitor, I want to see the Porjar Esport landing page so I can quickly find tournament info, live matches, and registration.

**Acceptance Criteria**
- Hero section with event title, dates, CTA buttons
- Games grid (5 game cards with icons)
- Live matches section (if any)
- Upcoming schedule (next 5 matches)
- Recent results
- Standings preview (top 3 per game)
- Footer with panitia info, Dispora Denpasar

**Edge Cases**
- No live matches — hide section or show "Tidak ada pertandingan live"
- No upcoming matches — show "Jadwal akan diumumkan"
- Event not started yet — show countdown to opening

**Role Access**
- View: public (no auth)
