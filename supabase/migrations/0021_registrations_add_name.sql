-- 0021 — add name to the pre-registration form (Name, Reg No, Phone, VIT Email)
begin;

alter table public.registrations add column name text not null default '';

commit;
