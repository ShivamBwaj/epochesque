# EPOCH — Build Progress & Remaining Work

Source of truth for ongoing work. Update this file as things get done or new issues appear.

## Status: ✅ COMPLETE & VERIFIED (ready to deploy)

## Verification results (final gate — all green)

| Check | Result |
|---|---|
| `npm run typecheck` | 0 errors |
| `npm run lint` | pass (2 acceptable `<img>` warnings on gallery pages) |
| `npm run build` | pass, 20 routes |
| `npm run test` (unit) | 11/11 pass (CSV engine + real Event_Details data) |
| `npm run test:e2e` (Playwright, real Supabase) | 6/6 pass — full team+admin journey |
| `npm run security:probe` | 16/16 denied — DB locked down |
| Supabase advisors | only intentional findings remain (see below) |
| DB state | pristine: 0 test rows, 1 admin user, buckets correct |

## ✅ Everything done

### Infrastructure
- [x] Next.js 16 App Router + TS + Tailwind v4 (`epoch/`), Vercel-ready
- [x] `.env.local` + `.env.local.example` (gitignored secrets)
- [x] npm scripts: dev/build/lint/typecheck/test/test:e2e/security:probe/db:migrate/seed:admin

### Database (migrations 0001–0004 applied, `supabase/migrations/`)
- [x] Tables: teams, problem_statements (max_teams capacity), submissions, scores, leaderboard_visibility, announcements, admins, event_settings, gallery_photos
- [x] RLS everywhere; anon/auth have NO direct access except: own team row, own submissions, own assigned PS, public timing/gallery
- [x] scores/announcements/leaderboard_visibility/admins: zero API grants (service-role only, verified by probe)
- [x] Publish-gated views: leaderboard_round1_public, leaderboard_final_public, winners_public (unpublished = 0 rows, probed)
- [x] roll_problem_statement(): SECURITY DEFINER, atomic claim (FOR UPDATE SKIP LOCKED), idempotent, anon-revoked, search_path pinned
- [x] 0002 revoked default TRUNCATE grants; 0003 advisor fixes; 0004 fixed ambiguous `id` OUT-param bug in roll fn
- [x] Storage: `submissions` private (signed URLs for admin), `gallery` public-read
- [x] Admin user: `admin@epoch.local` (password in .env.local)

### App (20 routes)
- [x] Public: landing (countdown/timeline/roll explainer), speakers, OC, gallery, leaderboard (locked/published/winners states), login, 404
- [x] Team dashboard: overview, problem-statement roll page (dice slot-machine, release gate, locked view), round1 PPT upload (25MB/type checks, replace-until-deadline), final GitHub submit (eligibility + deadline gates)
- [x] Admin: teams table (status/reset password/delete), CSV import wizard (group by Team Id → junk flags → leader select → credentials CSV download), PS manager (capacity bars), round1/final review (signed download links, advance/eliminate), scoring grid + publish/unpublish with spec-mandated warning, winners podium (draft/publish/unpublish), settings (5 datetime gates), gallery manager
- [x] Login rate limiting (per IP + per email)

### Tests
- [x] Unit: parser grouping, junk-row skip, duplicate-email flagging, quoted fields, CRLF, password strength, real-data validation (31 rows → 22 teams, leaders auto-picked)
- [x] E2E (against real project, self-seeding/cleaning): public pages, auth redirects, team journey (login→roll→lock→upload), team blocked from admin, admin journey (score→publish→leaderboard live→winners→unpublish), bad credentials

### Bugs found & fixed during testing
1. roll fn: ambiguous `id` OUT-param collision in UPDATE (0004)
2. e2e: `text=published` matched "unpublished" (substring race) → exact-match selector
3. e2e: `button[type=submit]` clicked header LOGOUT instead of upload → text selector
4. Orphan REPRO-*/E2E-* rows from debug scripts polluted roll pool → cleaned, DB now pristine
5. Parser: duplicate-email flagging now marks ALL teams sharing an email, not just the later one

## Remaining intentional advisor findings (do NOT "fix")
- `security_definer_view` ERROR on 3 public views — required design: views must bypass table RLS to expose ONLY published rows
- `rls_enabled_no_policy` INFO on 4 admin-only tables — deny-all is the intent
- `roll_problem_statement` authenticated-executable WARN — that's the feature itself (validated + atomic)
- `auth_leaked_password_protection` WARN — **dashboard toggle: user should enable in Auth settings (Auth → Providers → Email → Leaked password protection)**

## ⏳ Next steps for the user
- [ ] Deploy to Vercel: import repo, add env vars from `.env.local` (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)
- [ ] Enable "Leaked password protection" in Supabase Auth settings (dashboard)
- [ ] Replace placeholder speakers/OC data in `src/app/speakers/page.tsx` + `src/app/oc/page.tsx`
- [ ] Set event dates in `/admin/settings` (ps_release_at, deadlines)
- [ ] Import real teams via `/admin/teams/import` (Excel → Save As CSV UTF-8; spam team 19100 will appear — uncheck it in the preview)
- [ ] Add problem statements with capacities in `/admin/problem-statements`
- [ ] Post-event: upload gallery photos, announce winners
- [ ] Git init + commit when ready (not done — was never requested)

## Key facts
- Admin login: `admin@epoch.local` / `E2E_ADMIN_PASSWORD` in .env.local (`Ep0ch-HZTGHEhoPaR6BSF4!9` at time of writing — change if this file is ever shared)
- DB: pooler `aws-0-ap-southeast-2.pooler.supabase.com` (direct host is IPv6-only locally); MCP supabase-remote is read-only → DDL via `npm run db:migrate:file supabase/migrations/FILE.sql`
- Real registration data: `../Event_Details.xlsx (1).xlsx` (33 rows, 22 real teams after junk skip)
- `tests/fixtures/real-registration.csv` contains real PII — keep local, don't commit publicly
