-- ============================================================
-- 0015 — Grant leaderboard views to service_role
-- The views were only granted to anon/authenticated; the
-- service role (admin server actions / tests) got permission
-- denied. Harmless read grant, keeps admin-side reads working.
-- ============================================================

begin;

grant select on public.leaderboard_round1_public,
  public.leaderboard_round2_public,
  public.leaderboard_final_public,
  public.winners_public
  to service_role;

commit;
