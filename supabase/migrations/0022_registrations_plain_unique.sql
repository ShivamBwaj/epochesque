-- 0022 — swap the functional lower(reg_no) unique index for a plain unique
-- constraint on reg_no. PostgREST's upsert onConflict needs a real column
-- name to target, not an expression index; the app now normalizes reg_no
-- to uppercase before every write/read instead, so case-insensitive
-- de-duplication still holds.
begin;

drop index if exists public.registrations_reg_no_key;
alter table public.registrations add constraint registrations_reg_no_key unique (reg_no);

commit;
