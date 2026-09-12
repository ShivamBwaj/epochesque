# EPOCH — Event Website

Two-day hackathon site: teams log in, roll a locked problem statement, submit Round 1 PPTs, admins score and publish leaderboards, finalists submit GitHub repos, winners get announced.

**Stack:** Next.js 16 (App Router, TS, Tailwind v4) · Supabase (Postgres + Auth + Storage) · Vercel-ready.

## Quick start

```bash
npm install
cp .env.local.example .env.local   # fill in values (see below)
npm run db:migrate                 # applies all migrations in order
npm run seed:admin                 # creates the admin login
npm run dev
```

## Environment variables (.env.local)

| Var | What it is |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key (safe in browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | **SECRET** — server-only, never expose |
| `DATABASE_URL` | Postgres pooler URI (migrations only) |
| `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` | Admin credentials (seed + tests) |

## Admin guide

Login at `/login` with the admin account → `/admin`.

1. **Import teams** (`/admin/teams/import`): export the registration Excel as CSV (columns `Id, Name, Email, Ph_No, College, Payment Status, College Type, Team Id` — case-insensitive). The wizard groups people by Team Id, flags junk (rows without Team Id/name, teams without valid emails, duplicate emails), lets you pick the **leader** per team, then creates logins. Download the credentials CSV and share with leaders.
2. **Problem statements** (`/admin/problem-statements`): add the pool with per-PS capacity (`max_teams`) for the dice roll.
3. **Settings** (`/admin/settings`): set `ps_release_at` (gates the Roll button), `round1_deadline`, `final_deadline`, `event_start` (landing countdown).
4. **During the event**: teams roll + submit. `/admin/round1` shows decks (signed download links) with Advance/Eliminate actions.
5. **Scoring** (`/admin/scoring`): transcribe judge totals, then flip **Publish** per round. Unpublish before correcting — never edit behind a live leaderboard.
6. **Winners** (`/admin/announce-winners`): podium entries, save draft or publish.
7. **Gallery** (`/admin/gallery`): upload photos post-event.

## Security model

- RLS on every table; anon/authenticated have **no** direct table access except their own team row, their own submissions, their assigned PS, and public timing/gallery
- `scores`, `announcements`, `leaderboard_visibility`, `admins` have zero API grants — service-role server actions only
- Leaderboards/winners exposed only through publish-gated views (`leaderboard_round1_public`, `leaderboard_final_public`, `winners_public`)
- `submissions` Storage bucket is private (signed URLs for admin download); `gallery` bucket is public-read
- `roll_problem_statement()` is a SECURITY DEFINER function doing an atomic claim (`FOR UPDATE SKIP LOCKED`) — anon can't call it
- Login is rate-limited per IP and per email

Run `npm run security:probe` to re-verify (16 checks).

## Tests

```bash
npm run test          # unit: CSV parser + real registration data
npm run test:e2e      # Playwright: full team+admin journey against real Supabase
npm run security:probe
npm run typecheck && npm run lint
```

E2E seeds its own team/PS rows (`E2E-*`), cleans up after itself, and requires `.env.local`.

## Migrations

`supabase/migrations/0001..0004` — schema, grant hygiene, advisor fixes, roll-function fix. Apply with `npm run db:migrate` (idempotent-ish: 0001 is a single transaction, re-running it will fail — apply new changes as new files).
