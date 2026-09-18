-- ============================================================
-- 0045 — scores.total_score now stores each round's RAW mark out
-- of 10 (the judges' own rubric scale) instead of pre-scaling to
-- 0-100. leaderboard_round1_public / leaderboard_round2_public
-- already just pass total_score through untouched, so they now
-- correctly show raw out-of-10 with no view change needed.
--
-- leaderboard_final_public multiplies each round's raw /10 score by
-- its weight fraction directly (0.20/0.10/0.70) -- no rescaling, since
-- "20% of the OC Round score" just means 20% of that raw-out-of-10
-- number. This is the exact same formula as migration 0016; only the
-- meaning of total_score underneath it changed (raw/10, not 0-100).
-- ============================================================

begin;

create or replace view public.leaderboard_final_public
with (security_invoker = false) as
select rank() over (
         order by (coalesce(r1.total_score, 0) * 0.20
                 + coalesce(r2.total_score, 0) * 0.10
                 + coalesce(rf.total_score, 0) * 0.70) desc, t.team_code
       ) as rank,
       t.id as team_id, t.team_code, t.team_name,
       round(coalesce(r1.total_score, 0) * 0.20
           + coalesce(r2.total_score, 0) * 0.10
           + coalesce(rf.total_score, 0) * 0.70, 2)::numeric(6,2) as total_score,
       rf.notes as notes
from public.teams t
left join public.scores r1 on r1.team_id = t.id and r1.round = 'round1'
left join public.scores r2 on r2.team_id = t.id and r2.round = 'round2'
left join public.scores rf on rf.team_id = t.id and rf.round = 'final'
where (r1.id is not null or r2.id is not null or rf.id is not null)
  and exists (
    select 1 from public.leaderboard_visibility lv
    where lv.round = 'final' and lv.is_published
  );

commit;
