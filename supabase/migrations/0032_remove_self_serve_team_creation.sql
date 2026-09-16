-- ============================================================
-- 0032 — remove self-serve team creation.
-- Teams are now formed by admins only (admin_create_team_with_members,
-- see 0025). Revoke the participant-facing RPCs so the capability is
-- actually gone at the DB level, not just hidden in the UI — the
-- anon/authenticated key is public, so a client calling
-- supabase.rpc('create_team_with_members', ...) directly would
-- otherwise still work.
-- ============================================================

begin;

revoke execute on function public.create_team_with_members(text, uuid[]) from authenticated;
revoke execute on function public.search_teammates(text) from authenticated;

commit;
