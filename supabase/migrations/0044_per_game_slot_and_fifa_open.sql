-- ============================================================
-- 0044 — a team can hold one slot PER GAME instead of one slot
-- total across both games. Also opens FIFA booking now.
-- ============================================================

begin;

alter table public.game_slots drop constraint game_slots_taken_by_team_id_key;
create unique index game_slots_game_team_uniq on public.game_slots (game, taken_by_team_id) where taken_by_team_id is not null;

create or replace function public.book_game_slot(p_slot_id uuid)
returns table(slot_id uuid, slot_game text, slot_start text)
language plpgsql
security definer
set search_path to 'public'
as $function$
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

  if exists (select 1 from public.game_slots gs where gs.taken_by_team_id = v_team_id and gs.game = v_slot.game) then
    raise exception 'SLOT_ALREADY_BOOKED: your team already has a slot for this game';
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
$function$;

update public.event_settings set value = 'true'::jsonb where key = 'fifa_open';

commit;
