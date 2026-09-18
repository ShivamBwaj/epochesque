-- ============================================================
-- 0042 — FIFA moves to 11:40 AM - 5:00 PM, 15-min slots (was
-- 2:00-5:30 PM, 10-min). Zero FIFA bookings exist yet, so this is
-- a clean regenerate, not a migration of live bookings. Tekken
-- (0041) is untouched.
-- ============================================================

begin;

delete from public.game_slots where game = 'fifa';

insert into public.game_slots (game, slot_index, start_time)
select 'fifa', (row_number() over (order by m) - 1)::int, lpad((m / 60)::text, 2, '0') || ':' || lpad((m % 60)::text, 2, '0')
from generate_series(700, 1005, 15) as m
order by m;

commit;
