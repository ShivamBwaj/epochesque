-- 0006: manual event-day toggles for roll + final submissions
begin;

insert into public.event_settings (key, value) values
  ('roll_open', 'false'::jsonb),
  ('final_open', 'false'::jsonb)
on conflict (key) do nothing;

commit;
