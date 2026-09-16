-- ============================================================
-- 0033 — reschedule gaming slots + fix book_game_slot() for the
-- new team model.
--
-- Reschedule: 11:00-14:00 / 15-min / 12 per game -> 14:00-17:30 /
-- 10-min / 21 per game. No bookings existed at migration time (0
-- booked, confirmed), so slots are dropped and regenerated rather
-- than migrated in place.
--
-- Fix: book_game_slot() still resolved the caller's team via
-- teams.auth_user_id, which was the OLD CSV-import login model.
-- Since 0023, participants log in via registrations.auth_user_id ->
-- team_members -> teams, so every team formed under the new model
-- (i.e. every team now, since self-serve signup teams are gone) got
-- SLOT_NO_TEAM on every booking attempt. Also adds a leader-only
-- check to match the dashboard UI (only the leader's button is
-- enabled) and the same restriction submitRound1Action etc. apply.
-- ============================================================

begin;

delete from public.game_slots;

alter table public.game_slots drop constraint if exists game_slots_slot_index_check;
alter table public.game_slots add constraint game_slots_slot_index_check check (slot_index >= 0 and slot_index < 21);

insert into public.game_slots (game, slot_index, start_time)
select g.game, i, to_char((interval '14 hours' + (i * interval '10 minutes')), 'HH24:MI')
from (values ('tekken'), ('fifa')) as g(game)
cross join generate_series(0, 20) as i
on conflict do nothing;

drop function if exists public.book_game_slot(uuid);

create or replace function public.book_game_slot(p_slot_id uuid)
returns table (slot_id uuid, slot_game text, slot_start text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team_id uuid;
  v_is_leader boolean;
  v_slot public.game_slots%rowtype;
begin
  select tm.team_id, (tm.role = 'leader')
    into v_team_id, v_is_leader
  from public.registrations r
  join public.team_members tm on tm.registration_id = r.id
  where r.auth_user_id = auth.uid();

  if v_team_id is null then
    raise exception 'SLOT_NO_TEAM: no team linked to this account';
  end if;
  if not v_is_leader then
    raise exception 'SLOT_LEADER_ONLY: only the team leader can book a slot';
  end if;

  perform 1 from public.teams t where t.id = v_team_id for update;

  select * into v_slot from public.game_slots gs where gs.id = p_slot_id;
  if not found then
    raise exception 'SLOT_NOT_FOUND: slot does not exist';
  end if;

  if exists (select 1 from public.game_slots gs where gs.taken_by_team_id = v_team_id) then
    raise exception 'SLOT_ALREADY_BOOKED: your team already has a slot';
  end if;

  if v_slot.taken_by_team_id is not null then
    raise exception 'SLOT_TAKEN: another team grabbed this slot';
  end if;

  v_slot := null;
  update public.game_slots gs
     set taken_by_team_id = v_team_id, booked_at = now()
   where gs.id = p_slot_id and gs.taken_by_team_id is null
   returning gs.* into v_slot;

  if v_slot.id is null then
    raise exception 'SLOT_TAKEN: another team grabbed this slot';
  end if;

  return query select v_slot.id, v_slot.game, v_slot.start_time;
end;
$$;

grant execute on function public.book_game_slot(uuid) to authenticated;

commit;
