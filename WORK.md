# EPOCHESQUE — Build Progress & Remaining Work

Source of truth for ongoing work. Update this file as things get done or new issues appear.

## Status: ✅ v6 — LIVE, branded (HackClub), hero redesigned

## v6 — branding + hero
- [x] HackClub logo = site favicon + apple-touch icon (from `public/hackclub-logo.jpg`)
- [x] Footer: "Epochesque by HackClub" with logo
- [x] Hero redesigned: arena terminal removed; centered layout — dice GIF, badge, huge headline, rotating words, countdown, CTAs
- [x] Dice-roll Lottie GIF on the roll page + landing roll section

## v5 — production deploy + deep verification pass
- [x] GitHub repo + Vercel project + env vars (prod & preview) + push-to-deploy
- [x] **REAL BUG: Vercel ~4.5MB function body cap killed big uploads on prod** (worked locally, failed silently on Vercel). Rewrote ALL uploads (round1 decks, people photos, gallery) to browser→Supabase direct via signed upload URLs; server issues the URL, then verifies magic bytes + path + size on confirm. 12MB deck verified end-to-end on prod (upload, DB row, admin download = full 12MB).
- [x] **REAL BUG: deleting a team leaked a PS slot** — added `decrement_ps_taken()` RPC (migration 0009); deleteTeamAction calls it.
- [x] **REAL BUG: leader switch between existing members corrupted the members array** (email rewrite created duplicates). Fixed; only rewrites when the new email isn't already a member.
- [x] **REAL BUG: score input `step="0.5"` silently blocked quarter-point scores** (87.25 etc.) at the browser level — no error, no submit. Changed to `step="0.01"` (backend always accepted 2 decimals).
- [x] **REAL BUG: Settings save failed whenever any of the 5 clocks was empty** — `event_settings.value` is jsonb NOT NULL but cleared fields wrote SQL NULL → constraint error on every save with a blank field. Cleared fields now store `""` (reader treats as unset).
- [x] Login rate limits raised for event-day load: 60/15min per IP, 15/15min per email.
- [x] e2e seeds now deactivate real PS during runs (hermetic rolls next to real data); restore on cleanup.
- [x] Full prod verification: Phase A admin setup+CSV import 11/11 · Phase B team journey 18/18 (roll gate closed/open, PS lock, 12MB upload, final gate) · upload re-test 6/6 · Phase C admin deep pass 18/18 (leader dropdown change+restore, pw reset, walk-in add+login+delete, people+photos, deck download) · Phase D scoring/publish/DB-lock/CSV import/winners/notices 19/19 · settings+audit 5/5.
- [x] Security probe: 19/19 denied (incl. new people-table + upload-bypass probes).
- [x] **DB wiped PRISTINE for handover**: 0 teams / 0 PS / 0 submissions / 0 scores / 0 people / 0 audit, 1 admin, all gates closed, clocks cleared. Public pages verified in pristine state (locked leaderboard, empty states, no errors).

## v4 changes (user feedback round)
- [x] **FIX: SYSTEM FAULT on PPT uploads >10MB** (ref 3346774915) — root cause: Next.js 16 `proxy.ts` buffers request bodies with a **10MB default cap** (`experimental.proxyClientMaxBodySize`); bodies past that got truncated → "Unexpected end of form" → error boundary. v3 only raised the Server Action limit (30MB), not the proxy buffer. Now `proxyClientMaxBodySize: "35mb"` in next.config.ts. **Verified live: a 12MB PPTX uploads successfully.** Dev server restart required (done).
- [x] **Leader change is now a dropdown** on `/admin/teams`: pick any member (by name — email) from the team's member list instead of typing an email manually. "Set" submits; auth account email + team row + members array update together; password unchanged.
- [x] **Teams table fits the screen** — dropped the CREATED column (member count folded under team name), compact actions, no min-width. No more scrolling right to reach Delete.
- [x] **All admin tables de-scrolled**: round1, final, audit, scoring grid, PS manager — min-widths removed, long names/emails/URLs truncate with title tooltips.
- [x] **Renamed the event Epoch → Epochesque** everywhere user-facing: titles/metadata, nav + footer brand, OG image, admin console, e2e assertion, docs.
- [x] **NEW: People tab** (`/admin/people`, migration 0007) — manage **Speakers** and **OC members** from the admin console: name, role, tagline, tags (speakers), order, visible/hidden. They appear instantly on the public `/speakers` and `/oc` pages (DB-driven, published-only via RLS). Both pages have proper empty states until you add people.
- [x] **People photos** (migration 0008) — optional photo upload on the People forms (.jpg/.png/.webp, max 5MB, stored in the public `people` storage bucket). Renders as a circular Instagram-style pfp on `/speakers` + `/oc` and as a thumb in the admin table; initials-gradient fallback when no photo. Re-uploading replaces the old file; deleting a person cleans up their photo. Smoke-tested 6/6.
- [x] Fixed broken `db:migrate:file` npm script (arg was being swallowed); `db:migrate` now really applies all migrations in order; security probe updated for the 7 event_settings keys + people table (19 checks, all pass).
- [x] People smoke-tested through the real UI: add speaker (role/tagline/tags) + OC member → visible on public pages → delete → gone. 10/10.
- [x] Tests re-run: 19/19 unit, 9/9 e2e, typecheck/lint/build clean, security probe 19/19.

## Timing gates — behavior summary (user question)
- Deadlines (round1/final): **optional**. Empty = never auto-closes, submissions always allowed. Set them only if you want auto-close.
- Roll: **closed by default** until you click "Open roll" on Overview (or set ps_release_at in Settings for scheduled auto-open).
- Final submissions: **closed by default** until you click "Open final" (Overview or Final page).
- Event start: only drives the landing countdown; empty shows "TBA".

## v3 recap (superseded by v4 where noted)
Event-day toggles (`roll_open`/`final_open`, migration 0006), removed advance/eliminate flow, manual team add for walk-ins, status display-only. The v3 "edit leader email (✎ free-text)" became a **member dropdown** in v4.

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
- 0006: event-day toggles (roll_open/final_open) — APPLIED
- 0007: people table (speakers + OC, published-only public read) — APPLIED

## v1 recap (unchanged, still in place)
Auth (rate-limited login, team/admin roles), CSV team import wizard (Team Id grouping, leader select, credentials CSV), click-to-roll PS with atomic lock, round1 PPT + final GitHub submissions with deadline gates, scoring grid + publish toggles, winners podium, gallery, settings gates, RLS lockdown everywhere (verified by 16-probe security script), publish-gated leaderboard views.

## Next steps for the user (unchanged)
- [ ] Deploy to Vercel: env vars NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (+ optional NEXT_PUBLIC_SITE_URL for sitemap)
- [ ] Enable "Leaked password protection" in Supabase Auth settings (dashboard toggle)
- [ ] Add real speakers + OC members with roles and taglines at `/admin/people` (shows on `/speakers` + `/oc`)
- [ ] Set event dates in `/admin/settings`, import teams, add problem statements
- [ ] Post-event: upload gallery, announce winners
- [ ] `git remote add origin … && git push` when ready (repo is committed locally)

## Key facts
- Admin login: `admin@epoch.local` / `E2E_ADMIN_PASSWORD` in .env.local
- DB via pooler `aws-0-ap-southeast-2.pooler.supabase.com` (direct host is IPv6-only locally); MCP supabase-remote is read-only → DDL via `npm run db:migrate:file supabase/migrations/FILE.sql`
- e2e seeds `E2E-*` rows + cleans up (incl. audit rows since run start); real data fixture at tests/fixtures/real-registration.csv is gitignored (PII)
- Trench UI source: `C:\Users\Loq\Documents\CRAP\Trench\landing-site` (components/landing, aurora, reveal, rotating-words, stats patterns)
