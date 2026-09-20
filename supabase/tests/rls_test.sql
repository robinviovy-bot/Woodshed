-- Woodshed RLS test script (SPEC.md section 8):
-- "Write an SQL test script that signs in as two different users and
-- asserts that neither can read or write the other's rows. Run it before
-- deploying." Run it again after any policy change.
--
-- HOW TO RUN (no coding needed, just copy/paste):
--
-- 1. Run the migration (supabase/migrations/20260920000000_initial_schema.sql)
--    and the seed script (supabase/seed.sql) first, if you haven't already.
--
-- 2. Two fixture accounts already exist for this: rls-test-a@example.com
--    (67fa8b04-815a-409d-99ff-5df8d95778b0) and rls-test-b@example.com
--    (6657850b-1e22-481f-baa8-879017aa8c10), both created via Authentication
--    -> Users -> Add user with "Auto Confirm User" checked. Both UUIDs are
--    already filled in below -- if these accounts ever get deleted and
--    recreated, redo this step and swap in the new UUIDs throughout this
--    file (Find & Replace ALL).
--
-- 3. Go to the Supabase SQL Editor. Copy ONE block at a time (from one
--    "===== TEST" line down to just before the next one) into a fresh
--    query and click Run. Each block is self-contained on purpose --
--    running blocks out of order, or all at once, will not work correctly,
--    because each block impersonates a specific user for that block only.
--
-- 4. Read the single-row result each block prints. Every block should
--    say PASS. Any FAIL means a policy is missing or wrong -- do not
--    deploy until every block passes.
--
-- 5. When done, run the CLEANUP block. Leave the two fixture accounts in
--    place so this script stays ready to re-run whenever a policy changes.

-- ================= TEST 1 =================
-- Sets up test data: user A writes a drill_stats row for themselves.
-- Expect: one row returned (the row insert/update succeeded).
select set_config('request.jwt.claims', json_build_object('sub', '67fa8b04-815a-409d-99ff-5df8d95778b0')::text, true);
set local role authenticated;

insert into public.drill_stats (user_id, drill_id, session_count)
select '67fa8b04-815a-409d-99ff-5df8d95778b0'::uuid, id, 1 from public.drills limit 1
on conflict (user_id, drill_id) do update set session_count = 1
returning *;

-- ================= TEST 2 =================
-- User A reads their own drill_stats row back.
-- Expect: PASS
select set_config('request.jwt.claims', json_build_object('sub', '67fa8b04-815a-409d-99ff-5df8d95778b0')::text, true);
set local role authenticated;

select case when count(*) = 1 then 'PASS' else 'FAIL: expected 1 row, got ' || count(*) end as result
from public.drill_stats where user_id = '67fa8b04-815a-409d-99ff-5df8d95778b0'::uuid;

-- ================= TEST 3 =================
-- User B tries to read user A's drill_stats row.
-- Expect: PASS (0 rows visible to user B)
select set_config('request.jwt.claims', json_build_object('sub', '6657850b-1e22-481f-baa8-879017aa8c10')::text, true);
set local role authenticated;

select case when count(*) = 0 then 'PASS' else 'FAIL: user B can see ' || count(*) || ' of user A''s rows' end as result
from public.drill_stats where user_id = '67fa8b04-815a-409d-99ff-5df8d95778b0'::uuid;

-- ================= TEST 4 =================
-- User B tries to update user A's drill_stats row.
-- Expect: PASS (0 rows updated)
select set_config('request.jwt.claims', json_build_object('sub', '6657850b-1e22-481f-baa8-879017aa8c10')::text, true);
set local role authenticated;

with attempt as (
  update public.drill_stats set session_count = 999
  where user_id = '67fa8b04-815a-409d-99ff-5df8d95778b0'::uuid
  returning 1
)
select case when count(*) = 0 then 'PASS' else 'FAIL: user B updated ' || count(*) || ' of user A''s rows' end as result
from attempt;

-- ================= TEST 5 =================
-- User B tries to delete user A's drill_stats row.
-- Expect: PASS (0 rows deleted)
select set_config('request.jwt.claims', json_build_object('sub', '6657850b-1e22-481f-baa8-879017aa8c10')::text, true);
set local role authenticated;

with attempt as (
  delete from public.drill_stats
  where user_id = '67fa8b04-815a-409d-99ff-5df8d95778b0'::uuid
  returning 1
)
select case when count(*) = 0 then 'PASS' else 'FAIL: user B deleted ' || count(*) || ' of user A''s rows' end as result
from attempt;

-- ================= TEST 6 =================
-- User B tries to read user A's profile row.
-- Expect: PASS (0 rows visible)
select set_config('request.jwt.claims', json_build_object('sub', '6657850b-1e22-481f-baa8-879017aa8c10')::text, true);
set local role authenticated;

select case when count(*) = 0 then 'PASS' else 'FAIL: user B can see user A''s profile' end as result
from public.profiles where id = '67fa8b04-815a-409d-99ff-5df8d95778b0'::uuid;

-- ================= TEST 7 =================
-- User B reads the shared catalog (this should always work -- catalog
-- tables are readable by any authenticated user).
-- Expect: PASS (53 drills, per SPEC.md section 4's drill-count table)
select set_config('request.jwt.claims', json_build_object('sub', '6657850b-1e22-481f-baa8-879017aa8c10')::text, true);
set local role authenticated;

select case when count(*) = 53 then 'PASS' else 'FAIL: expected 53 drills, got ' || count(*) end as result
from public.drills;

-- ================= TEST 8 =================
-- User B tries to write to the catalog.
-- Expect: PASS -- this block is SUPPOSED to fail with a "row-level
-- security policy" error. That error IS the pass condition. If it
-- succeeds silently instead, that's a FAIL: it would mean an ordinary
-- user can write to the shared catalog.
select set_config('request.jwt.claims', json_build_object('sub', '6657850b-1e22-481f-baa8-879017aa8c10')::text, true);
set local role authenticated;

insert into public.drills (exercise_id, bpm, pool)
select id, 999, 'naturals' from public.exercises limit 1;

-- ================= CLEANUP =================
-- Run this last, as yourself (not impersonating anyone), to remove the
-- test row TEST 1 created.
reset role;
select set_config('request.jwt.claims', null, true);

delete from public.drill_stats where user_id = '67fa8b04-815a-409d-99ff-5df8d95778b0'::uuid;
