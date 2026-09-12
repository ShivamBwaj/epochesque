-- 0003_security_fixes.sql — advisor remediation
begin;

alter function public.touch_updated_at() set search_path = public;

revoke execute on function public.roll_problem_statement() from public, anon;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
revoke execute on function public.touch_updated_at() from public, anon, authenticated;

commit;
