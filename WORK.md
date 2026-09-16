# EPOCHESQUE — Build Progress & Remaining Work

Source of truth for ongoing work. Update this file as things get done or new issues appear.

## Status: 🚧 v10 in progress (NOT deployed — production still on v9.1 code)

## v10 — individual signup + self-formed teams (in progress, local/DB only)

Registration is no longer team-first (admin CSV import of known Team Ids) — it's
individual-first: everyone in `registrations` (fed by register-site + a polled
Google Sheet) signs up themselves, then forms/joins a 2-4 person team from their
own dashboard, once, irreversibly.

- [x] Schema: `registrations.auth_user_id`, `team_members` (one row per person,
      ever — `registration_id` is unique, which is what makes "no team switching"
      automatic), `create_team_with_members` / `admin_create_team_with_members` /
      `admin_move_team_member` / `admin_set_team_leader` / `search_teammates` /
      `get_my_team` SECURITY DEFINER RPCs (migrations 0023-0026)
- [x] Self-serve signup (`/login/setup`): reg no + email must match an
      unclaimed `registrations` row, then the person sets their own password —
      replaces the old "team leader first-login" flow entirely
- [x] Dashboard team-setup gate: anyone with no `team_members` row sees a
      mandatory "form your team" screen instead of the dashboard (naturally
      resumable — sign out and back in, still no row, still see the gate).
      Search teammates by reg no/name, pick 1-3, review, explicit warning
      ("cannot create another team or go back on your decision"), lock it in
      atomically (2-4 members enforced by the RPC)
- [x] Admin `/admin/teams` rewritten: roster view per team + "unassigned
      registrants" panel (search, register-someone-new, create-team-from-selection),
      per-member move/make-leader/reset-account, incomplete-team (<2) badge
- [x] Admin `/admin/teams/add`: walk-in desk tool — registers 2-4 people (or
      reuses existing rows) and forms a team from them in one step
- [x] Removed entirely: CSV team-import wizard, `leader_email`/`password_set`
      first-login flow, `src/lib/csv.ts` registration parser — no longer
      relevant now that teams aren't pre-known
- [x] Attendance reworked to key off `registrations` instead of `teams.members`
      (migration 0027 — **drops and recreates `attendance`**, so the currently
      *deployed* production code's attendance page is broken until this ships;
      per instruction, holding all deploys until everything in this list is
      done, then deploying + verifying together). Unassigned registrants show
      in their own card so check-in works before any teams exist.
- [x] `netlify/functions/sync-registrations.mts` — scheduled function (every 5
      min) that polls the Epochesque Registrations Google Sheet and inserts any
      row not yet in `registrations` (catches walk-ins OC types directly into
      the sheet). Verified the parse/diff logic against the real sheet (350
      rows parsed correctly); can't invoke the scheduled function itself
      without `netlify dev`/a real deploy.
- [x] `npm run add:admin -- email password` — lets each organizer get their own
      admin login (concurrent admin sessions already work out of the box;
      Supabase Auth allows multiple simultaneous sessions per account)
- [x] Fixed a pre-existing `tsconfig.json` bug (register-site, now its own
      separate repo, was still being typechecked/built as part of this
      project) — excluded it
- [x] **Certificates** — done. Template exported by the user, measured the
      exact name-line coordinates off the 6000x3375 PNG, `src/lib/certificate.ts`
      (pdf-lib) stamps the name (auto-shrinks for long names). Template lives
      in a new private `certificates` Storage bucket. `/api/certificate`
      (participant, gated by a `certificates_published` event_settings flag
      admins toggle from Settings) and `/api/admin/certificates/download-all`
      (one combined multi-page PDF — embedding the template once and reusing
      it across pages is what keeps ~380 people under 3 seconds; a
      one-PDF-per-person zip approach took over two minutes and would have
      timed out on Netlify).
- [x] **Google Drive uploads** — done, via OAuth (not a service account —
      service accounts have no storage quota outside a paid Workspace Shared
      Drive, which this plan doesn't have). `src/lib/google-drive.ts`, admin
      "Connect Google Drive" button on Settings (one-time consent, refresh
      token stored in `integration_secrets`), Round 1 upload flow
      (`round1-form.tsx` + `beginRound1UploadAction`/`submitRound1Action`)
      uses Drive when connected, Supabase Storage otherwise — automatic
      fallback, no breakage either way. One folder per team, created lazily,
      cached on `teams.drive_folder_id`.
- [x] **Leader-only actions** — team leader is the only one who can upload
      the deck, submit the final repo, and book a gaming slot; every member
      can see everything (problem statement shown large/prominent to
      everyone). Enforced both in the UI and inside the server actions
      themselves (`isTeamLeader()` in database.types.ts).
- [x] **Found + fixed a real bug while testing the leader gating**: several
      RLS policies (`submissions`, `problem_statements`, `teams`) and the
      `book_game_slot()` function still resolved "my team" via the OLD
      `teams.auth_user_id = auth.uid()` model — silently broken for every
      new self-formed team (round1/final submission reads always showed
      "nothing uploaded yet" even after a successful upload; gaming booking
      rejected every new team with SLOT_NO_TEAM). Fixed via a
      `my_team_ids()` SECURITY DEFINER helper + updated policies (migrations
      0030-0031). Verified directly against a real signed-in test session,
      not just by reading the code.
- [ ] **Not done yet: actually clicking "Connect Google Drive"** — the OAuth
      client is wired up but nobody has completed the one-time consent flow
      (that has to be a human clicking "Allow" in their own browser signed
      into the Drive-owning account, not something to do on their behalf).
      Round 1 uploads fall back to Supabase Storage until this happens — no
      urgency, but flag it before assuming Drive uploads are live.
- [ ] Deploy: full test suite + build, then `netlify deploy --prod`, then
      verify live (attendance especially, since its schema changed) — only
      when the user says go. **User must also re-login to the correct Netlify
      account first** — flagged mid-session that the CLI was on the wrong one.
      Before deploying: set `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`,
      `GOOGLE_DRIVE_ROOT_FOLDER_ID`, and a **production** `GOOGLE_OAUTH_REDIRECT_URI`
      (`https://epochesque.netlify.app/api/admin/google-drive/callback` — the
      `.env.local` one points at localhost) as real Netlify env vars, or the
      Drive connect button will fail once deployed.
- [ ] Update GUIDE.md/README.md/CONTRACTS.md — several sections still describe
      the old CSV-import team model and say "Vercel" (actual deploy is
      Netlify per v9.1 above); not yet corrected.

## v9.1 — Netlify deploy (production)

## v9.1 — Netlify deploy (production)
- [x] **LIVE: https://epochesque.netlify.app** — netlify-cli installed + logged in, site created (clean URL), env vars set (production + preview), `netlify deploy --prod`.
- [x] **REAL BUG: Next 16 `proxy.ts` can't bundle on Netlify** (plugin expects the old middleware convention — "Cannot find module './chunks/[turbopack]_runtime.js'"). Fixed: renamed back to `src/middleware.ts` with `export async function middleware` — builds fine locally + on Netlify (deprecation warning accepted).
- [x] Verified live on production: landing/speakers/oc(+Aman)/login/leaderboard all 200, auth redirects work (307 → /login), leaderboard locked.
- [x] Full suite green after reweight: **unit 19/19 · e2e 13/13 · security probe all denied**. One test updated (leaderboard weight 15/15/70 → 20/10/70); the transient failures were Supabase gateway timeouts + PostgREST schema-cache lag after the view recreation — both confirmed clean on rerun.
- [x] Deploy method: CLI manual (`netlify deploy --prod`). Optional GitHub auto-deploy: docs/deploy-netlify.md has the 3-step link. Vercel still mirrors the repo (same DB) — share only the netlify.app URL with participants.

## v9 — people cards final + cleanup + deploy
- [x] **People cards = cyscomvit.com/our-team board style** (studied live via browser): 3/4 aspect photo cards, grayscale(20%) → full color on hover, image zoom 110%, card lift (-translate-y-2), per-person accent color (12-color cycle on role text + hover border/glow), bottom gradient overlay with name + role, tagline fades in on hover. Site headings/copy untouched (SectionHeading as before). Speaker with 1 entry = feature card + tags.
- [x] **Photo pipeline (manual, no runtime AI)**: `/admin/people` upload → react-easy-crop modal locked 3:4 card ratio (zoom + drag) → webp export → signed-URL upload + magic-byte verify. **Edit existing people**: name/role/tagline/order changes, photo replace (new crop), photo removal (new `remove_photo` flag → deletes file, card falls back to initials).
- [x] **DB wiped pristine for the event**: submissions (incl. storage), scores, attendance marks, game bookings, test people (2 Shivams) — all pre-event testing junk. Kept: 23 real teams, 3 PS, Aman's card (3:4 webp), audit roll history, event_start clock, gates closed.
- [x] `scripts/process-person.mjs` (remove.bg one-time cutout tool, key in .env.local) + `scripts/pristine-handover.mjs` (the cleanup above, re-runnable).
- [x] Netlify migration: `netlify.toml` + `docs/deploy-netlify.md` (college wifi blocks vercel.app; uploads bypass the host so nothing else changes).

## v8.5 — OC / speakers card redesign + photo pipeline
- [x] **PersonCard (TiltedCard port)** on `/oc` + `/speakers`: 3D tilt on hover (framer-motion springs), scale 1.06, photos stay FULL COLOR (no grayscale, no bg removal), name + role on a gradient scrim at the bottom (translateZ depth), **12 rotating gradient color themes per card** so a full OC grid shows variety (indigo/rose/emerald/violet/amber/sky/teal/pink/orange/blue/lime/fuchsia rings). No-photo fallback = initials on the person's gradient. Speaker with exactly 1 entry renders as a big feature card + tagline + tags; more = grid.
- [x] **Manual crop upload in `/admin/people`**: pick any photo → crop modal (react-easy-crop) with **locked 4:5 card ratio**, zoom slider + drag → "Use this crop" exports webp via canvas → uploads through the existing signed-URL + magic-byte verified flow. Replaces the old circular-pfp input.
- [x] Aman added to `/oc` with his original photo, auto-cropped 4:5 cover (117 KB webp) — visible now on the dev server.
- [x] One-time `scripts/process-person.mjs` (remove.bg API + sharp 4:5 + upload + upsert) kept for optional cutout style; key in `.env.local` (`REMOVE_BG_API_KEY`), never deploys.
- [x] Cleanup: imgly packages removed (0 vulnerabilities), ProfileCard experiment deleted, typecheck 0 errors, lint 0 errors (3 benign `<img>` warnings), /oc + /speakers + /admin/people verified live.

## v8.4 — scoring weights + round rename
- [x] **Final leaderboard re-weighted** (migration 0016, applied to live DB): `leaderboard_final_public` = **20% OC Round 1 (PPT) + 10% Quiz + 70% Senior Final Evaluation** (was 15/15/70). Verified in DB: 100/100/100 → 100.00 · only-OC → 20.00 · only-Quiz → 10.00 · only-Final → 70.00. Missing rounds still count 0.
- [x] **Renamed round everywhere user-facing**: "PPT Round" → **OC Round 1** (scoring tabs, decks page, admin nav, overview stat, settings clock, leaderboard board, dashboard labels, deadline/submission messages). Final round relabeled **Senior Final** in scoring + "Senior Final Evaluation — Weighted Score" on the leaderboard. Kept "PPT" only where it means the file itself ("Submit PPT deck", "PPT submission received" — e2e assertion untouched).
- [x] Typecheck 0, lint clean on all touched files, all pages render (307 login gates as expected).

## v8.3 — roll stage scrollbar fix
- [x] **Scrollbar on the roll stage killed**: the fixed overlay sits on top of the admin page, which is taller than the viewport → the document scrolled underneath and the OS scrollbar strip showed at the screen edge. RollStage now locks `html`/`body` overflow while mounted (restored on exit). No other changes — the spin stays as-is.

## v8.2 — reel spin rebuilt (simple)
- [x] **REAL BUG: `SPIN_DISTANCE` was used but never defined** — the decel phase threw a ReferenceError every spin, leaving the reel stuck in the fast loop / frozen mid-spin ("weird, insanely fast, inconsistent, sometimes off"). Root cause of the mess.
- [x] **Spin logic replaced with ONE simple rAF state machine** (killed the 3-effect drift/handoff/tween juggling): slow drift (90px/s) → smooth 0.85s ramp → cruise at 1600px/s (fast, exciting, still readable — was ~2300 before = dizzy) → power ease-out decel onto the winner with **exact velocity-continuous handoff** (k solved from cruise speed).
- [x] **Synced to the audio**: total spin targets 5.0s = roll.mp3 length; reveal chime fires right as the roll sound ends. If the server is slow, cruise simply holds until the result arrives (decel starts the moment it does, min 1.5s).
- [x] Deterministic landing math unchanged (starts from a position congruent mod pool-cycle → invisible jump, lands exactly on the winner under the gold marker). Watchdog (15s) + clean error recovery back to idle. Wrap normalization kept (no more running past the strip).
- [x] Verified: typecheck 0, lint 0 errors, unit 19/19, e2e "team journey: admin rolls on stage" PASS (44s, real DB, seeds + cleans its own data).
- [x] **Netlify migration prep** (`docs/deploy-netlify.md` + `netlify.toml`): college wifi blocks vercel.app. Nothing code-side changes (uploads already go browser→Supabase directly); guide covers import-from-GitHub, the 4 env vars, and the transition plan.

## v8.1 — reel polish round
- [x] **Reel rebuilt to match case.oki.gg**: spaced cards (12px gap), full-width viewport, edge fade mask, gold marker line, motion blur via velocity, spaced rounded cards (no borders-in-queue look).
- [x] ~~Spin starts at full speed~~ (replaced in v8.2 — was the source of the speed bugs).
- [x] **Wrap bug fixed**: the fast loop now wraps x back exactly one pool cycle (strip is periodic → invisible), normalized into a safe band so the viewport can never run past the strip end (this was the "goes black" glitch).
- [x] **Sound sync**: roll.mp3 (with embedded ticks) starts on click; reveal chime (1 of 4) on land; mute toggle; WebAudio synth fallback if files missing.
- [x] **GhostFibers background** (React Bits, ogl) behind the roll stage — original blue palette, dimmed to 60% + dark overlay; sidebar/reel/cards all layered above (z-0 bg / z-10+ content); reel has its own dark translucent backing so cards read clearly.
- [x] **"Case" wording removed everywhere** → ROLL IT !! button, "the roll has spoken", landing copy updated; fixed-overlay Roll Stage with retractable team sidebar (‹‹ / ››), no auto-advance (operator picks next team).
- [x] Full suite green after the refactor: 13/13 e2e, 19/19 unit, probe all denied.

## v8 — projector roll + judging restructure
- [x] **Roll moved to admin side** (`/admin/roll`, migration 0014): the OC calls each team up and rolls the CS2 case on the projector — team picker sidebar (rolled/waiting badges, search, auto-advance to next team after landing), huge projector-sized reel. Atomic admin-only RPC `roll_problem_statement_for()` (checks admins table inside; equal distribution preserved). Team's PS page is now view-only with 5s auto-refresh ("WAITING FOR YOUR TURN ON STAGE") — updates the instant the stage roll lands. Every stage roll is audit-logged (`roll.stage`).
- [x] **Admin nav grouped** into 5 labeled sections — Event Day (Overview, Roll Stage, Attendance, Gaming) / Teams & Problems / Judging (PPT Decks, Final Repos, Scoring, Leaderboard, Winners) / Site Content / System — no more 15-item wall.
- [x] **Quiz round added** (migration 0014): `round2` in scores + leaderboard_visibility + publish toggle + Scoring tab + leaderboard board. No submissions page (quiz masters enter scores in the grid).
- [x] **Final leaderboard weighted 15% PPT + 15% Quiz + 70% Final** — computed in the `leaderboard_final_public` view (missing rounds = 0), so it's consistent everywhere. Verified: 100/100/100 → 100.00; 100/0/0 → 15.00.
- [x] **Renamed everywhere**: Round 1 → PPT Round (nav, scoring, decks page, team dashboard, settings, messages); Submit R1 → Submit PPT.
- [x] Bug fixed in flight: leaderboard views were never granted to `service_role` (only anon) — admin-client reads got permission denied. Migration 0015 grants them.
- [x] e2e updated: team journey now = admin rolls on stage → team page locks; new weighted-leaderboard test (13/13 pass). Probe: 25 checks all denied.

## v7 — event-day features
- [x] **Attendance** (`/admin/attendance`, migration 0010): Day 1/Day 2 sub-tabs, one card per team (grouped by team code), per-member checkboxes with reg no, one-click ✓ mark-whole-team button, search (team/name/reg no), "incomplete teams only" filter, CSV download (Team, Team Name, Name, Register Number, Present/Absent) honoring filters. Optimistic UI + 2.5s polling across all open admin panels + per-team ordered write queue → crowd-check-in with zero perceptible delay.
- [x] **Google Sheet live backup for attendance**: every tick mirrors to a Google Sheet via Apps Script webhook (pushed with `after()` — never blocks the click), plus a **⟳ Re-sync Google Sheet** button that rewrites the tab exactly from the DB. Setup: `docs/attendance-google-sheet.md` + `ATTENDANCE_SHEETS_WEBHOOK_URL` env var. DB stays the source of truth; sheet is the live mirror/backup.
- [x] **Gaming slots** (migrations 0011+0013): Tekken + FIFA, 12 × 15-min slots each (11:00–14:00). **One team per slot, one slot per team** — both enforced atomically inside `book_game_slot()` (team-row lock + conditional claim; races impossible). Team picks at `/dashboard/gaming`; admin sees the full hierarchy + Clear button at `/admin/gaming` (audit-logged).
- [x] **CS2 case-opening roll** (replaces dice): horizontal card reel, 6.2s ease-out spin, speed-based motion blur, per-card tick sound, predetermined winner (server resolves BEFORE the animation, reel math lands exactly on it), win pop + shine sweep + particle burst + reveal chime. Sounds pulled to `public/sounds/` (roll.mp3 = oki.gg unlock sound incl. embedded ticks; 4 reveal variants picked randomly). Reduced-motion + mute supported. Responsive card widths.
- [x] **Equal PS distribution** (migration 0012): roll now hands out the LEAST-taken statement first (random tie-break) — 80 teams over 3 fixed statements split ~27/27/26 instead of random drift. **Bug fixed in flight:** 0012 originally regressed the 0004 OUT-param ambiguity fix (`where id` → `teams.id` vs return `id`) — caught by e2e, fixed with `as t` alias, re-applied.
- [x] **Concurrent scoring**: scoring grid now tracks dirty rows and saves ONLY those — multiple judges' panels can score different teams simultaneously without stale-value clobbering (verified by a two-browser e2e: panel B's save no longer rewrites panel A's newer score). Save state shows unsaved-edit count.
- [x] **Leaderboard is admin-only now**: `/leaderboard` requires admin login (redirects everyone else), removed from public nav/footer/robots, added to the admin sidebar. Publish toggles unchanged.
- [x] Migrations 0010–0013 applied to live DB; e2e extended (attendance days, gaming book/clear/rebook, scoring concurrency, leaderboard redirect) — 12/12 pass; unit 19/19; probe 24 checks all denied.

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

