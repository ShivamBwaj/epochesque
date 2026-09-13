-- ============================================================
-- 0014 — Quiz round + weighted final leaderboard + stage roll
--   * scores/leaderboard_visibility: add 'round2' (quiz)
--   * leaderboard_round2_public view (quiz board)
--   * leaderboard_final_public = 15% PPT + 15% Quiz + 70% Final
--   * roll_problem_statement_for(team) — organizers roll on
--     stage for each team (admins table checked inside)
-- ============================================================

begin;

alter table public.scores drop constraint scores_round_check;
alter table public.scores add constraint scores_round_check check (round in ('round1','round2','final'));

alter table public.leaderboard_visibility drop constraint leaderboard_visibility_round_check;
alter table public.leaderboard_visibility add constraint leaderboard_visibility_round_check check (round in ('round1','round2','final'));

insert into public.leaderboard_visibility (round, is_published)
values ('round2', false)
on conflict (round) do nothing;

create or replace view public.leaderboard_round2_public
with (security_invoker = false) as
select rank() over (order by s.total_score desc) as rank,
       s.team_id, t.team_code, t.team_name, s.total_score, s.notes
from public.scores s
join public.teams t on t.id = s.team_id
where s.round = 'round2'
  and exists (
    select 1 from public.leaderboard_visibility lv
    where lv.round = 'round2' and lv.is_published
  );

grant select on public.leaderboard_round2_public to anon, authenticated;

-- Final board: weighted 15/15/70 (missing rounds count as 0)
create or replace view public.leaderboard_final_public
with (security_invoker = false) as
select rank() over (
         order by (coalesce(r1.total_score, 0) * 0.15
                 + coalesce(r2.total_score, 0) * 0.15
                 + coalesce(rf.total_score, 0) * 0.70) desc, t.team_code
       ) as rank,
       t.id as team_id, t.team_code, t.team_name,
       round(coalesce(r1.total_score, 0) * 0.15
           + coalesce(r2.total_score, 0) * 0.15
           + coalesce(rf.total_score, 0) * 0.70, 2)::numeric(6,2) as total_score,
       rf.notes as notes
from public.teams t
left join public.scores r1 on r1.team_id = t.id and r1.round = 'round1'
left join public.scores r2 on r2.team_id = t.id and r2.round = 'round2'
left join public.scores rf on rf.team_id = t.id and rf.round = 'final'
where (r1.id is not null or r2.id is not null or rf.id is not null)
  and exists (
    select 1 from public.leaderboard_visibility lv
    where lv.round = 'final' and lv.is_published
  );

-- Stage roll: organizer rolls FOR a team (projector flow)
create or replace function public.roll_problem_statement_for(p_team_id uuid)
returns table (id int, code text, title text, description text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team public.teams%rowtype;
  v_ps_id int;
begin
  if not exists (select 1 from public.admins a where a.user_id = auth.uid()) then
    raise exception 'ROLL_ADMIN_ONLY: only organizers can roll on stage';
  end if;

  select * into v_team from public.teams t where t.id = p_team_id;
  if not found then
    raise exception 'ROLL_NO_TEAM: no team linked to this id';
  end if;

  if v_team.problem_statement_id is not null then
    return query
      select ps.id, ps.code, ps.title, ps.description
      from public.problem_statements ps
      where ps.id = v_team.problem_statement_id;
    return;
  end if;

  if v_team.status not in ('registered', 'round1') then
    raise exception 'ROLL_NOT_ELIGIBLE: team status % cannot roll', v_team.status;
  end if;

  update public.problem_statements ps
     set taken_count = ps.taken_count + 1, updated_at = now()
   where ps.id = (
     select p.id from public.problem_statements p
     where p.is_active and p.taken_count < p.max_teams
     order by p.taken_count asc, random()
     limit 1
     for update skip locked
   )
   returning ps.id into v_ps_id;

  if v_ps_id is null then
    raise exception 'ROLL_POOL_EMPTY: no problem statements available';
  end if;

  update public.teams as t
     set problem_statement_id = v_ps_id,
         ps_locked_at = now(),
         status = case when t.status = 'registered' then 'round1' else t.status end,
         updated_at = now()
   where t.id = v_team.id;

  return query
    select ps.id, ps.code, ps.title, ps.description
    from public.problem_statements ps
    where ps.id = v_ps_id;
end;
$$;

grant execute on function public.roll_problem_statement_for(uuid) to authenticated;

commit;
