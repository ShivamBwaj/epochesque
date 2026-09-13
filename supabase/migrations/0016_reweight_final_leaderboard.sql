-- ============================================================
-- 0016 — Final leaderboard re-weighted: 20% OC Round 1 (PPT)
--        + 10% Quiz + 70% Senior Final Evaluation
--   (was 15/15/70 — updated per organizing committee)
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
