-- 0018: manual event-day toggle for gaming slot booking (mirrors roll_open / final_open)
begin;

insert into public.event_settings (key, value) values
  ('gaming_open', 'false'::jsonb)
on conflict (key) do nothing;

commit;
