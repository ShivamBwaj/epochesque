# EPOCH — Build Progress & Remaining Work

Source of truth for ongoing work. Update this file as things get done or new issues appear.

## Status: ✅ v3 COMPLETE — event-day controls, upload fix, manual teams, leader email edit

## v3 changes (user feedback round)
- [x] **FIX: SYSTEM FAULT on PPT upload** — root cause: Next.js Server Action default body limit of 1 MB. Raised to 30 MB in next.config.ts (`experimental.serverActions.bodySizeLimit`). Dev server restart required (done).
- [x] **Event-day toggles**: `roll_open` + `final_open` flags (migration 0006, default CLOSED). Big switch cards on `/admin` Overview; Final page also has the final toggle. Roll: teams see "waiting for organizers" until flipped (or auto-opens at scheduled ps_release_at if set). Final submissions: open for ALL teams when flipped — advance/eliminate concept removed entirely.
- [x] **Removed all Advance/Eliminate/Revert buttons** from `/admin/round1` and `/admin/final`; removed status dropdown from `/admin/teams` (status is display-only now). Round 1 page links straight to Scoring.
- [x] **Edit leader email** (✎ on `/admin/teams`): updates the auth account email + team row + members array; rejects clashes; password unchanged — for on-the-spot leader changes.
- [x] **Manual team add** (`/admin/teams/add`): walk-in registrations — team name/code, leader details, optional extra members; generates + shows password once.
- [x] Round1/final submission server actions no longer check team status (round1: deadline only; final: final_open flag + deadline).
- [x] Dashboard overview/problem-statement/final pages updated for the new gates.
- [x] e2e seed now hermetic: force-unpublishes leaderboards + opens both toggles during the run, resets after.
- [x] Cleaned user's manual test artifacts from live DB: 3 junk round1 scores (5/4/9) deleted; leaderboard unpublished. (22 real imported teams untouched.)
- [x] Tests re-run: 9/9 e2e green, typecheck/lint clean.

## Timing gates — behavior summary (user question)
- Deadlines (round1/final): **optional**. Empty = never auto-closes, submissions always allowed. Set them only if you want auto-close.
- Roll: **closed by default** until you click "Open roll" on Overview (or set ps_release_at in Settings for scheduled auto-open).
- Final submissions: **closed by default** until you click "Open final" (Overview or Final page).
- Event start: only drives the landing countdown; empty shows "TBA".

## v2.1 additions (previous round)
- [x] **Real-data dry-run import** (`scripts/dry-run-import.mjs`): all 22 real teams + auth users created against live DB with ZERO errors, spot-check login verified, full cleanup — DB pristine after
- [x] **GUIDE.md** — the full human guide: architecture ("is there a backend" — yes, explained), every page & what it does, team flow, chronological admin runbook, security model, deploy, commands
- [x] **OG image** (`src/app/opengraph-image.tsx`, edge ImageResponse — verified rendering HTTP 200 PNG) + **favicon** (`src/app/icon.svg`, dice logo)
- [x] README now links to GUIDE.md

## Final verification (all green)

| Check | Result |
|---|---|
| `npm run typecheck` | 0 errors |
| `npm run lint` | 0 errors (3 benign `<img>` warnings on gallery) |
| `npm run build` | pass, 22 routes |
| `npm run test` (unit) | 19/19 — CSV parser, scores parser, magic bytes, real registration data |
| `npm run test:e2e` | 9/9 — full journeys incl. notices, audit, CSV score import, score-lock, fake-file rejection |
| `npm run security:probe` | 16/16 denied |
| DB state after tests | pristine (0 rows, 1 admin user, audit cleaned) |
| `npm audit` | 0 vulnerabilities |

## v2 — what was added (on top of v1)

### UI — full Trench design port (`C:\Users\Loq\Documents\CRAP\Trench\landing-site`)
- [x] Design system: warm amber accent (#c2703e), near-black bg (#0a0a0b), liquid-glass cards, noise texture overlay, aurora keyframes (globals.css)
- [x] Fonts: Instrument Serif (display/italic accents) + Inter (body) via next/font
- [x] Floating pill glass header with scroll state (site-nav.tsx, client) + server wrapper (site-header.tsx)
- [x] AuroraBackground component (ported) powering the landing hero
- [x] Landing page rebuilt: aurora hero (live badge, rotating words "prototype/pitch/debug/ship/win", countdown, CTAs) + DiceFeed (animated live roll feed, Trench alert-feed style) + StatsBar (animated numbers) + HowItWorks (6-step stagger cards) + RollSection (bento with animated dice) + FinalCta (glow card)
- [x] Reveal/StaggerContainer/StaggerItem, AnimatedNumber, RotatingWords components (framer-motion)
- [x] Shared ui.tsx restyled: pill buttons (accent/glass), accent-toned badges, surface inputs
- [x] Login page, dashboard/admin navs (accent pill style), admin layout, public pages — all on new palette
- [x] deps added: framer-motion, lucide-react; removed vulnerable xlsx (0 vulns now)

### Features
- [x] **Score CSV import** (`/admin/scoring`): paste judges' Google Form summary as CSV (team_code,score,notes), client preview + validation, server-side team-code resolution, per-row errors (unknown teams rejected)
- [x] **Notices broadcast** (`/admin/notices`): draft/publish/unpublish/delete announcements; published notices render on team dashboard (📣 banner in dashboard layout)
- [x] **Admin audit log** (`admin_audit` table + `/admin/audit` page): every admin mutation logged (actor, action, target, details, timestamp); shown on admin overview
- [x] **Admin overview dashboard** (`/admin`): live stats (teams by status, PS capacity, submissions), event gates panel, leaderboard publish state, recent audit feed
- [x] **Magic-byte upload validation**: PPT/PPTX/PDF file contents verified (PDF %PDF, PPTX PK zip, PPT OLE) — renamed junk rejected server-side
- [x] **DB-level score lock** (migration 0005 trigger): scores INSERT/UPDATE blocked while that round's leaderboard is published — even via service role; UI also guards with clear error
- [x] **Security headers** (next.config.ts): CSP, HSTS, X-Frame-Options DENY, nosniff, referrer policy, permissions policy
- [x] **SEO**: robots.ts (admin/dashboard disallowed), sitemap.ts, OG metadata
- [x] **UX**: error.tsx boundary, dashboard/admin loading skeletons
- [x] **Backup script**: `node scripts/export-backup.mjs` → JSON dump of all tables to backups/ (gitignored)

### Migrations
- 0001–0004: schema, grants hygiene, advisor fixes, roll fn fix (unchanged from v1)
- 0005: admin_audit table (RLS, service-role only) + guard_scores_locked trigger — APPLIED

## v1 recap (unchanged, still in place)
Auth (rate-limited login, team/admin roles), CSV team import wizard (Team Id grouping, leader select, credentials CSV), click-to-roll PS with atomic lock, round1 PPT + final GitHub submissions with deadline gates, scoring grid + publish toggles, winners podium, gallery, settings gates, RLS lockdown everywhere (verified by 16-probe security script), publish-gated leaderboard views.

## Next steps for the user (unchanged)
- [ ] Deploy to Vercel: env vars NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (+ optional NEXT_PUBLIC_SITE_URL for sitemap)
- [ ] Enable "Leaked password protection" in Supabase Auth settings (dashboard toggle)
- [ ] Replace placeholder speakers/OC data (`src/app/speakers/page.tsx`, `src/app/oc/page.tsx`)
- [ ] Set event dates in `/admin/settings`, import teams, add problem statements
- [ ] Post-event: upload gallery, announce winners
- [ ] `git remote add origin … && git push` when ready (repo is committed locally)

## Key facts
- Admin login: `admin@epoch.local` / `E2E_ADMIN_PASSWORD` in .env.local
- DB via pooler `aws-0-ap-southeast-2.pooler.supabase.com` (direct host is IPv6-only locally); MCP supabase-remote is read-only → DDL via `npm run db:migrate:file supabase/migrations/FILE.sql`
- e2e seeds `E2E-*` rows + cleans up (incl. audit rows since run start); real data fixture at tests/fixtures/real-registration.csv is gitignored (PII)
- Trench UI source: `C:\Users\Loq\Documents\CRAP\Trench\landing-site` (components/landing, aurora, reveal, rotating-words, stats patterns)
