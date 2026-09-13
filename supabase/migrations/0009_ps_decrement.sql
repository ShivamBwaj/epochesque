-- 0009: atomic PS taken_count decrement (used when a team with a PS is deleted)
begin;

create or replace function public.decrement_ps_taken(ps_id int)
returns void
language sql
security definer
set search_path = public
as $$
  update public.problem_statements
     set taken_count = greatest(0, taken_count - 1),
         updated_at = now()
   where id = ps_id;
$$;

revoke execute on function public.decrement_ps_taken(int) from anon, authenticated;
grant execute on function public.decrement_ps_taken(int) to service_role;

commit;
