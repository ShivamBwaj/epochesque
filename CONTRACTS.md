# EPOCH — Page Builder Contracts

Read this fully before writing any file. You are building pages for the Epochesque hackathon website (Next.js 16 App Router + Supabase + Tailwind v4). Work ONLY inside `src/app/<your-scope>/` and the client component files explicitly assigned to you. Do NOT modify shared files (layout, lib, components/ui.tsx, etc). Do NOT add dependencies. Do NOT add code comments.

## Global rules

- TypeScript strict. Server Components by default; add `"use client"` only when the file needs hooks/handlers.
- NO comments in code.
- All data pages that read cookies/DB must export `const dynamic = "force-dynamic"`.
- Every page: `export const metadata` with a title (template adds "— Epochesque").
- Dark theme only. Use Tailwind classes + the shared components. Key vibes: near-black `#05060f` bg, cyan/indigo accents, mono HUD labels (`hud-label` class), `card`, `card-hover`, `text-gradient`, `ring-glow` classes available in globals.css.
- Import shared UI from `@/components/ui`: `Button, LinkButton, Card, Badge, StatusBadge, Label, Input, Select, Textarea, Alert, SectionHeading, EmptyState, StatCard, Prose, buttonClass`.
- Client form components: `@/components/submit-button` → `SubmitButton` (uses useFormStatus; props: children, pendingText, variant, size, className, confirm).
- Countdown: `@/components/countdown` → `<Countdown target={isoOrNull} label="..." pastLabel="CLOSED" />` (client comp, use from server pages fine).
- `CopyField` (client) from `@/components/copy-field` for one-click copy values.
- Statuses: `registered | round1 | advanced | finalist | eliminated`. Rounds: `round1 | final`.

## Server-side helpers you can import

- `@/lib/supabase/server` → `createClient()` (user-scoped, RLS-enforced; async).
- `@/lib/supabase/admin` → `createAdminClient()` (service role, SERVER ONLY, never leak data to clients carelessly — admin pages only).
- `@/lib/auth` → `requireTeamPage()`, `requireAdminPage()`, `getViewer()`, `getSessionUser()`, `isAdmin()`, `getTeamByUserId()`.
- `@/lib/settings` → `getEventTiming()` (returns `{ event_start, ps_release_at, round1_deadline, final_deadline, event_end }` — ISO strings or null), `deadlinePassed(iso)`.
- DB row types from `@/lib/database.types`: `Team, ProblemStatement, Submission, Score, GalleryPhoto, TeamMember, WinnersEntry, EventTiming`.

## Server actions (already built — consume, don't rebuild)

- `@/lib/actions/auth`: `loginAction` (used by LoginForm), `logoutAction()`.
- `@/lib/actions/team`:
  - `rollProblemStatementAction(): Promise<{ ok: boolean; error?: string }>`
  - `submitRound1Action(prev, formData)` — field `file` (File). Returns `{ ok?, error?, message? }`.
  - `submitFinalAction(prev, formData)` — field `url` (GitHub URL). Same shape.
- `@/lib/actions/admin` (all guarded; forms calling void-returning ones use `<form action={...}>`):
  - `importTeamsConfirmAction(prev, formData)` — hidden field `payload` = JSON of teams array `[{ key, team_code, team_name, leaderIndex, members: [{ member_id, name, email, phone, college, payment_status, college_type }] }]`. Returns `ImportResult` (has `credentials[]`, `createdCount`, `errors[]`).
  - `updateTeamStatusAction(formData)` — `teamId`, `status`.
  - `resetTeamPasswordAction(prev, formData)` — `teamId`. Returns `{ ok, password?, message?, error? }`.
  - `deleteTeamAction(formData)` — `teamId`.
  - `upsertProblemStatementAction(prev, formData)` — `id?`, `code`, `title`, `description`, `max_teams`, `is_active` (checkbox `on`).
  - `deleteProblemStatementAction(formData)` — `id`.
  - `saveScoresAction(prev, formData)` — `round` + per-team `score_<teamId>` / `notes_<teamId>`.
  - `setLeaderboardPublishedAction(formData)` — `round`, `published` ("true"/"false").
  - `saveWinnersAction(prev, formData)` — `title`, `entries` (JSON `[{position, team_code, team_name, prize?}]`), `publish` ("true" when publishing).
  - `saveSettingsAction(prev, formData)` — `event_start`, `ps_release_at`, `round1_deadline`, `final_deadline`, `event_end` (datetime-local strings, empty = clear).
  - `galleryUploadAction(prev, formData)` — `files` (multi File), `caption`.
  - `galleryDeleteAction(formData)` — `id`.
- CSV parse (pure, client-usable): `@/lib/csv` → `parseRegistrationCsv(text)` returns `{ teams: ParsedTeam[], skipped: [{row, reason}], totalRows }`. `ParsedTeam = { key, team_code, team_name, members: ParsedMember[], leaderIndex, include, issues }`, `ParsedMember = { row, member_id, name, email, phone, college, payment_status, college_type, email_valid }`.

## Database access patterns for pages

- Public pages (leaderboard/gallery): `createClient()` (anon). Leaderboard data: `supabase.from("leaderboard_round1_public").select("*")` and `"leaderboard_final_public"`, winners: `.from("winners_public").select("*")`. Empty result = not published yet → show locked state. Gallery: `gallery_photos` rows; image URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/gallery/${row.storage_path}`.
- Team pages: `requireTeamPage()` returns `{ user, team }` (team = full row). Own submissions: `(await createClient()).from("submissions").select("*").eq("team_id", team.id)` (RLS allows own row). Assigned PS: `.from("problem_statements").select("*").eq("id", team.problem_statement_id).maybeSingle()` — only works if assigned.
- Admin pages: `requireAdminPage()` then `createAdminClient()` for full reads: teams, problem_statements, submissions, scores, leaderboard_visibility, announcements, gallery_photos. For PPT download links: `admin.storage.from("submissions").createSignedUrl(path, 300)` then render `data.signedUrl`.

## Scope assignments

- Agent A (public): `src/app/page.tsx` (landing), `src/app/speakers/page.tsx`, `src/app/oc/page.tsx`, `src/app/gallery/page.tsx`, `src/app/leaderboard/page.tsx`, `src/app/login/page.tsx`, `src/app/not-found.tsx`.
- Agent B (dashboard): everything under `src/app/dashboard/`.
- Agent C (admin): everything under `src/app/admin/`.

## Quality bar

- After writing all your files run `npx tsc --noEmit` from the repo root and fix every error in YOUR files. If an error points at a shared file, report it instead of editing it.
- Mobile-responsive: use responsive Tailwind classes.
- Empty states everywhere data can be absent.
- No lorem ipsum: write real, short, punchy copy for a hackathon called "Epochesque" run by a college tech club. Speakers/OC come from the `people` table (admin-managed) — pages must handle the empty state gracefully.
- Verify: `npx tsc --noEmit` passes.
