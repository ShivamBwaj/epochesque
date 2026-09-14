-- ============================================================
-- 0019 — Self-serve leader password setup.
-- Teams now get a random, never-shown placeholder password at
-- creation; leaders set their own on first login. password_set
-- tracks whether that's happened, so admins can see who still
-- needs to (and it flips back to false on an admin reset).
-- ============================================================

begin;

alter table public.teams add column password_set boolean not null default false;

commit;
