-- ============================================================
-- 0011 — Gaming slots (Tekken + FIFA, 11:00–14:00, 15-min)
-- Rules enforced at the DB level:
--   * one team per slot  -> slot row claimed atomically
--   * one slot per team  -> unique(taken_by_team_id) + team-row
--                           lock inside book_game_slot()
-- Security: RLS on, zero direct grants -> booking only via
-- book_game_slot() RPC (SECURITY DEFINER, authenticated).
-- ============================================================

begin;

create table public.game_slots (
  id uuid primary key default gen_random_uuid(),
  game text not null check (game in ('tekken', 'fifa')),
  slot_index int not null check (slot_index >= 0 and slot_index < 12),
  start_time text not null,
  taken_by_team_id uuid unique references public.teams(id) on delete set null,
  booked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (game, slot_index)
);

alter table public.game_slots enable row level security;

insert into public.game_slots (game, slot_index, start_time)
select g.game, i, to_char((interval '11 hours' + (i * interval '15 minutes')), 'HH24:MI')
from (values ('tekken'), ('fifa')) as g(game)
cross join generate_series(0, 11) as i
on conflict do nothing;

create or replace function public.book_game_slot(p_slot_id uuid)
returns table (slot_id uuid, slot_game text, slot_start text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team public.teams%rowtype;
  v_slot public.game_slots%rowtype;
begin
  select * into v_team from public.teams t where t.auth_user_id = auth.uid();
  if not found then
    raise exception 'SLOT_NO_TEAM: no team linked to this account';
  end if;

  perform 1 from public.teams t where t.id = v_team.id for update;

  select * into v_slot from public.game_slots gs where gs.id = p_slot_id;
  if not found then
    raise exception 'SLOT_NOT_FOUND: slot does not exist';
  end if;

  if exists (select 1 from public.game_slots gs where gs.taken_by_team_id = v_team.id) then
    raise exception 'SLOT_ALREADY_BOOKED: your team already has a slot';
  end if;

  if v_slot.taken_by_team_id is not null then
    raise exception 'SLOT_TAKEN: another team grabbed this slot';
  end if;

  v_slot := null;
  update public.game_slots gs
     set taken_by_team_id = v_team.id, booked_at = now()
   where gs.id = p_slot_id and gs.taken_by_team_id is null
   returning gs.* into v_slot;

  if v_slot.id is null then
    raise exception 'SLOT_TAKEN: another team grabbed this slot';
  end if;

  return query select v_slot.id, v_slot.game, v_slot.start_time;
end;
$$;

grant execute on function public.book_game_slot(uuid) to authenticated;

grant all on public.game_slots to service_role;

commit;
