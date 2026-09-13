-- 0007: people table — admin-managed speakers + organizing committee
-- shown on the public /speakers and /oc pages.
-- Public can read only published rows; writes are service-role only.
begin;

create table public.people (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('oc', 'speaker')),
  name text not null,
  role text not null default '',
  tagline text not null default '',
  tags jsonb not null default '[]'::jsonb,
  sort_order int not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.people enable row level security;

create policy "people_select_published" on public.people
  for select to anon, authenticated
  using (is_published);

create trigger trg_people_touch before update on public.people
  for each row execute function public.touch_updated_at();

grant select on public.people to anon, authenticated;
grant all on public.people to service_role;

revoke insert, update, delete, truncate on public.people from anon, authenticated;

create index people_kind_order_idx on public.people (kind, sort_order);

commit;

do $$
declare
  r record;
  bad text[];
begin
  for r in
    select table_name, privilege_type
    from information_schema.table_privileges
    where table_schema = 'public'
      and table_name = 'people'
      and grantee in ('anon', 'authenticated')
      and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')
  loop
    bad := bad || (r.table_name || ':' || r.privilege_type);
  end loop;
  if bad is not null then
    raise exception 'SECURITY CHECK FAILED - unexpected write grants: %', bad;
  end if;
end $$;
