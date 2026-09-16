-- ============================================================
-- 0037 — project pages are admin-only, not public. Revoke the
-- anon/authenticated grant added in 0036; the view is now reached
-- only through /projects/[teamCode], which is gated the same way
-- /leaderboard is (requireAdminPage() + service-role reads).
-- ============================================================

begin;

revoke select on public.project_pages_public from anon, authenticated;
grant select on public.project_pages_public to service_role;

commit;
