-- ============================================================
-- 0046 — the senior final round is now stored out of 100 (its own
-- rubric is out of 50, doubled on import) instead of out of 10 like
-- quiz/OC round. leaderboard_final_public's weighting formula
-- assumed all three rounds were out of 10 (multiplying by the raw
-- weight fraction); updated so quiz/OC round scale up to their
-- point value (x1/x2, since they're out of 10) while the final
-- round's 70% applies directly since it's already out of 100.
-- ============================================================

begin;

create or replace view public.leaderboard_final_public
with (security_invoker = false) as
select rank() over (
         order by (coalesce(r1.total_score, 0) * 2
                 + coalesce(r2.total_score, 0) * 1
                 + coalesce(rf.total_score, 0) * 0.70) desc, t.team_code
       ) as rank,
       t.id as team_id, t.team_code, t.team_name,
       round(coalesce(r1.total_score, 0) * 2
           + coalesce(r2.total_score, 0) * 1
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
