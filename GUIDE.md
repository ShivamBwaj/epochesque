# EPOCH — The Complete Guide

The website for **Epoch**, a 48-hour hackathon where teams don't pick their problem — they **roll** it like dice, get locked in instantly, build through two rounds, and climb a publicly published leaderboard.

Dark, glassy, aurora-animated UI · roll-the-dice mechanic · zero setup for participants.

---

## 1. Is there a backend? (Architecture)

**Yes — but you don't run a separate backend server.** The backend is two pieces that talk to each other:

```
Browser (participant/admin)
    │
    ▼
Next.js server (runs on Vercel)
    ├── Pages render server-side (secure — secrets never reach the browser)
    ├── Server Actions = the API (login, roll, upload, score, publish…)
    │       every write goes through an admin-or-owner check HERE
    ▼
Supabase (the database + more)
    ├── Postgres — all tables (teams, scores, problem statements…)
    ├── Auth — login accounts & sessions
    └── Storage — uploaded PPT files (private) + gallery images (public)
```

| Concern | Handled by |
|---|---|
| Pages & UI | Next.js 16 (App Router, React, Tailwind, framer-motion) |
| API / business logic | Next.js **Server Actions** (`src/lib/actions/`) — server-only functions the forms call directly |
| Database | Supabase Postgres (`supabase/migrations/` has the full schema) |
| Login & sessions | Supabase Auth (email + password) |
| File uploads | Supabase Storage (`submissions` bucket = private, `gallery` = public) |
| Hosting | Vercel (frontend + server actions), Supabase cloud (DB) |

**Key rule:** the browser only ever holds the *anon* key. It cannot read or write anything the server doesn't explicitly allow — the database rejects anonymous access at the Postgres level (RLS). Every mutation (creating teams, saving scores, publishing leaderboards) runs on the server with the *service role* key, after checking "is this actually an admin?".

---

## 2. Every page & what it does

### Public (no login)
| Page | What it is |
|---|---|
| `/` | Landing — aurora hero, live countdown, "How it works" timeline, the Roll explainer, animated demo feed of dice rolls |
| `/speakers` | Speaker lineup (placeholder people until you edit the file) |
| `/oc` | Organizing committee (placeholder people until you edit the file) |
| `/leaderboard` | Rankings. Shows 🔒 "Revealed after judging" until an admin publishes. Winners banner appears when published. |
| `/gallery` | Photo grid — empty ("Photos drop after the event") until admin uploads |
| `/login` | Single login page for **everyone** — admin and teams. The site routes you based on who you are. |

### Team dashboard (after team login)
| Page | What it does |
|---|---|
| `/dashboard` | Mission control — team status, problem statement state, submission states, deadline countdown, member list, 📣 organizer notices |
| `/dashboard/problem-statement` | **The dice roll.** Big animated 🎲 button. Before release time: countdown lock. After rolling: your locked problem, forever. |
| `/dashboard/submit/round1` | Upload the pitch deck (.ppt/.pptx/.pdf, max 25 MB, real-file-content-checked). Replaceable until the deadline. |
| `/dashboard/submit/final` | Paste the GitHub repo link (shortlisted teams only, until final deadline) |

### Admin console (after admin login)
| Page | What it does |
|---|---|
| `/admin` | Overview — live counts (teams/status/rolls/submissions), event gate states, recent admin actions |
| `/admin/teams` | Every team: code, members, login email, PS, status. Change status, reset password (shows once, copy it), delete team |
| `/admin/teams/import` | **CSV import wizard** (details below) |
| `/admin/problem-statements` | Add/edit the problem pool. Each PS has a `max_teams` capacity — how many teams the dice can assign it |
| `/admin/round1` | All Round 1 decks — download via expiring links, Advance/Eliminate/Revert teams |
| `/admin/final` | Shortlisted teams' GitHub links, mark finalists/winners |
| `/admin/scoring` | The judging sheet — type scores in the grid **or** import the judges' Google-Form CSV. Publish/Unpublish toggle per round |
| `/admin/announce-winners` | Podium builder — positions, team codes, prizes. Draft → Publish |
| `/admin/notices` | Broadcast short announcements to every team dashboard (e.g. "deadline extended 30 min") |
| `/admin/gallery` | Upload event photos (they appear on `/gallery`) |
| `/admin/audit` | Append-only log of every admin action — who did what, when |
| `/admin/settings` | The five clocks: event start (landing countdown), PS release (unlocks the roll button), Round 1 deadline, Final deadline, event end |

---

## 3. Team flow (what participants experience)

1. **Register off-site** at the fest desk/form (not on this site).
2. OC imports the list → team leader receives an **email + password** from the organizers.
3. Leader goes to `/login`, signs in → lands on `/dashboard`.
4. Waits for the release clock → hits **🎲 Roll** → gets a problem statement, **locked permanently** (no re-rolls, even across logins — it's atomic and race-proof).
5. Builds. Uploads the deck at `/dashboard/submit/round1` (can re-upload until the deadline — newest file wins).
6. Watches `/leaderboard` unlock when judging finishes.
7. If shortlisted (status shows it on their dashboard): submits the GitHub repo at `/dashboard/submit/final`.
8. Winners show up on `/leaderboard` + the landing page banner.

---

## 4. Admin flow (chronological runbook)

### Before the event (T-minus days)
1. **Set the clocks** — `/admin/settings`: event start, PS release time, Round 1 deadline, Final deadline.
2. **Load the problem pool** — `/admin/problem-statements`. Set `max_teams` per PS (e.g. 20 PSs × 5 teams each = 100 capacity). Total capacity must be ≥ team count.
3. **Import teams** — `/admin/teams/import`:
   - Export the registration Excel as **CSV UTF-8** (File → Save As → CSV).
   - Columns: `Id, Name, Email, Ph_No, College, Payment Status, College Type, Team Id` (case-insensitive, extra columns fine).
   - Rows with the **same Team Id become one team**. Junk rows (no team id/name) are auto-skipped and listed.
   - For each team, **pick the leader** (default = first member with a valid email). The leader's email becomes the login.
   - Teams with duplicate emails or no valid email get flagged — uncheck or fix them.
   - Confirm → accounts are created → **download the credentials CSV** (team, email, password) and share with leaders.

### Day 1 — speaker session + Round 1
4. At the announced moment, the Roll button unlocks automatically (from `ps_release_at`). Nothing to click.
5. Teams roll and build. Watch `/admin` for live roll/submission counts.
6. Send **notices** (`/admin/notices`) for anything urgent — they appear on every team dashboard instantly.
7. As decks come in, review them at `/admin/round1` (download links are signed, expire in 5 min).

### After Round 1 closes — judging
8. Judges score via their Google Form (external, as always).
9. Enter totals at `/admin/scoring` — either type into the grid, or **Import scores from CSV** (`team_code,score,notes` — paste the form summary, unknown team codes are rejected and listed).
10. **Publish** the round → `/leaderboard` goes live instantly. (Scores are now **database-locked** until you unpublish — nobody, not even the service key, can silently edit a live leaderboard.)
11. Shortlist teams at `/admin/round1` (Advance / Eliminate) — advanced teams see the final-round submit page unlock on their dashboards.

### Day 2 — final round
12. Shortlisted teams submit GitHub repos (auto-gated by status + deadline).
13. Judges score again → `/admin/scoring?round=final` → Publish.

### Closing + post-event
14. `/admin/announce-winners` — build the podium, Save & Publish.
15. `/admin/gallery` — upload photos.
16. If anything needs investigating later — `/admin/audit` has every action ever taken, with timestamps.

---

## 5. Security model (why nobody can mess with the data)

- **RLS on every table.** Anonymous visitors: total denial. Teams: can read *only their own* row, their own submission, their assigned problem. That's it.
- **Zero API grants** on scores, announcements, leaderboard visibility, admins, audit log — these tables are invisible to the outside; only server-side admin actions touch them.
- **Score lock trigger** — Postgres itself refuses score edits while that round's leaderboard is published. You must unpublish first (visible action) before correcting.
- **The roll is atomic** (`SELECT … FOR UPDATE SKIP LOCKED`) — two teams clicking simultaneously can never claim the same slot. No re-rolls: the function is idempotent and returns your existing PS.
- **Upload checks**: extension + size + **magic bytes** (a `.exe` renamed `.pptx` is rejected — file content is inspected).
- **Private submissions bucket** — decks are only reachable via expiring signed URLs generated for the admin.
- **Login rate-limited** per IP and per email.
- **Security headers** (CSP, HSTS, X-Frame-Options DENY, nosniff) in production.
- Verify anytime: `npm run security:probe` — 16 automated attack probes, all must say DENIED.

---

## 6. Testing

| Command | What it runs |
|---|---|
| `npm run test` | 19 unit tests — CSV parser, score parser, magic-byte checks, **your real 33-row registration file** |
| `npm run test:e2e` | 9 Playwright journeys against the real Supabase: public pages, auth redirects, full team journey (login→roll→lock→upload), team blocked from admin, full admin journey (score→publish→live leaderboard→winners→unpublish), CSV score import, notices broadcast + audit trail, fake-file rejection |
| `npm run security:probe` | 16 anon-key attack probes (all tables, RPC, storage) |
| `npm run typecheck && npm run lint` | Static checks |
| `node scripts/dry-run-import.mjs` | Imports your real registration file into the live DB, verifies, cleans up (run before event day for peace of mind) |

E2E tests seed their own `E2E-*` data and clean up after themselves — safe to run against production.

---

## 7. Deploy (Vercel)

```bash
git push        # to GitHub
```
Then on Vercel: New Project → import repo → add environment variables:

| Var | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | from `.env.local` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from `.env.local` |
| `SUPABASE_SERVICE_ROLE_KEY` | from `.env.local` (secret — never commit) |
| `NEXT_PUBLIC_SITE_URL` | your final domain (for sitemap/OG) |

Also flip on **Leaked password protection** in Supabase → Authentication → Settings.

DB migrations: `npm run db:migrate` (applies `supabase/migrations/` via the pooler `DATABASE_URL`).

---

## 8. Commands & files reference

| Command | Purpose |
|---|---|
| `npm run dev` | Local dev server |
| `npm run build` / `start` | Production build/run |
| `npm run db:migrate` | Apply all migrations |
| `npm run seed:admin` | Create/repair the admin account |
| `npm run security:probe` | Re-verify lockdown |
| `node scripts/export-backup.mjs` | JSON backup of every table → `backups/` |

| File/Folder | What lives there |
|---|---|
| `src/app/` | All pages (public `/`, team `/dashboard/*`, admin `/admin/*`) |
| `src/lib/actions/` | The "backend" — server actions (auth, team, admin) |
| `src/lib/csv.ts` | Registration + score CSV parsers |
| `src/lib/validate.ts` | Upload validation (extension, size, magic bytes) |
| `src/components/` | UI kit, aurora, hero, dice feed, countdown |
| `supabase/migrations/` | Database schema + security (5 migrations) |
| `tests/` | Unit + E2E suites |
| `WORK.md` | Live build log / status |
