-- 0002_hygiene.sql — strip default TRUNCATE grants from anon/authenticated
begin;

revoke truncate on public.teams, public.problem_statements, public.submissions,
  public.scores, public.leaderboard_visibility, public.announcements,
  public.admins, public.event_settings, public.gallery_photos
  from anon, authenticated;

revoke truncate on public.leaderboard_round1_public, public.leaderboard_final_public,
  public.winners_public
  from anon, authenticated;

-- belt & suspenders: ensure no write privileges at all for API roles
revoke insert, update, delete on public.teams, public.problem_statements,
  public.submissions, public.scores, public.leaderboard_visibility,
  public.announcements, public.admins, public.event_settings, public.gallery_photos
  from anon, authenticated;

commit;

do $$
declare
  r record;
  bad text[];
begin
  for r in
    select table_name, privilege_type
    from information_schema.table_privileges
    where table_schema = 'public'
      and grantee in ('anon', 'authenticated')
      and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')
  loop
    bad := bad || (r.table_name || ':' || r.privilege_type);
  end loop;
  if bad is not null then
    raise exception 'SECURITY CHECK FAILED - unexpected write grants: %', bad;
  end if;
  raise notice 'SECURITY CHECK PASSED: anon/authenticated have no write grants in public schema';
end $$;
