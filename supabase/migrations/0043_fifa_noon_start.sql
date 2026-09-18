-- ============================================================
-- 0043 — FIFA start time moves from 11:40 AM to 12:00 PM (still
-- 15-min slots, still ends 5:00 PM). Zero FIFA bookings existed at
-- the time of this change, so this is a clean regenerate.
-- ============================================================

begin;

delete from public.game_slots where game = 'fifa';

insert into public.game_slots (game, slot_index, start_time)
select 'fifa', (row_number() over (order by m) - 1)::int, lpad((m / 60)::text, 2, '0') || ':' || lpad((m % 60)::text, 2, '0')
from generate_series(720, 1005, 15) as m
order by m;

commit;
