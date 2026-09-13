# EPOCH — Event Website

Two-day hackathon site with a Trench-style aurora UI: teams log in, roll a locked problem statement, submit Round 1 PPTs, admins score (grid or CSV import) and publish leaderboards, finalists submit GitHub repos, winners get announced, notices broadcast to dashboards, every admin action is audit-logged.

**➡️ Full guide (architecture, admin runbook, team flow, security, deploy): [GUIDE.md](./GUIDE.md)**

**Stack:** Next.js 16 (App Router, TS, Tailwind v4, framer-motion) · Supabase (Postgres + Auth + Storage) · Vercel-ready.

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
| `NEXT_PUBLIC_SITE_URL` | Optional — canonical URL for sitemap/SEO |

## Admin guide

Login at `/login` with the admin account → `/admin`.

1. **Overview** (`/admin`): live event state — teams, rolls, submissions, gates, recent audit actions.
2. **Import teams** (`/admin/teams/import`): export the registration Excel as CSV (columns `Id, Name, Email, Ph_No, College, Payment Status, College Type, Team Id` — case-insensitive). The wizard groups people by Team Id, flags junk, lets you pick the **leader** per team, then creates logins. Download the credentials CSV and share with leaders.
3. **Problem statements** (`/admin/problem-statements`): add the pool with per-PS capacity (`max_teams`).
4. **Settings** (`/admin/settings`): `ps_release_at` gates the Roll button; deadlines gate submissions; `event_start` drives the landing countdown.
5. **During the event**: teams roll + submit. `/admin/round1` shows decks (signed download links) with Advance/Eliminate actions.
6. **Scoring** (`/admin/scoring`): enter totals in the grid **or** bulk-import the judges' Google Form summary as CSV (`team_code,score,notes`). Then flip **Publish** per round. Scores are hard-locked at the database level while a round is published — unpublish before correcting.
7. **Winners** (`/admin/announce-winners`): podium entries, save draft or publish.
8. **Notices** (`/admin/notices`): broadcast short announcements to every team dashboard.
9. **Gallery** (`/admin/gallery`): upload photos post-event.
10. **Audit** (`/admin/audit`): append-only log of every admin mutation.

## Security model

- RLS on every table; anon/authenticated have **no** direct table access except their own team row, own submissions, assigned PS, and public timing/gallery
- `scores`, `announcements`, `leaderboard_visibility`, `admins`, `admin_audit` have zero API grants — service-role server actions only
- DB trigger blocks score edits while a leaderboard is published (works even against service-role writes)
- Leaderboards/winners exposed only through publish-gated views
- `submissions` Storage bucket is private (signed URLs); `gallery` is public-read
- `roll_problem_statement()` is SECURITY DEFINER + atomic claim (`FOR UPDATE SKIP LOCKED`); anon can't call it
- Upload magic-byte validation (real PDF/PPTX/PPT content required)
- Login rate-limited per IP + per email; CSP/HSTS/XFO security headers in production

Run `npm run security:probe` to re-verify (16 checks).

## Tests

```bash
npm run test            # unit: CSV parsers, magic bytes, real registration data
npm run test:e2e        # Playwright: full team+admin journeys against real Supabase
npm run security:probe
npm run typecheck && npm run lint
```

E2E seeds its own `E2E-*` rows, cleans up after itself (including audit rows), and requires `.env.local`.

## Migrations & backups

- `supabase/migrations/0001..0005` — schema, grant hygiene, advisor fixes, roll-function fix, audit table + score-lock trigger
- Apply with `npm run db:migrate` (or `npm run db:migrate:file supabase/migrations/FILE.sql`)
- `node scripts/export-backup.mjs` — JSON backup of all tables into `backups/`

