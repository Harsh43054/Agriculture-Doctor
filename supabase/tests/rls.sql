-- Run in the Supabase SQL editor against the migrated project.
-- Creates temporary test-only rows and rolls the complete transaction back.
begin;
insert into auth.users(id) values
  ('a0000000-0000-4000-8000-000000000001'),
  ('a0000000-0000-4000-8000-000000000002');
insert into public.soil_readings(user_id, field, moisture, ph, temperature) values
  ('a0000000-0000-4000-8000-000000000001', 'QA own', 40, 6.5, 24),
  ('a0000000-0000-4000-8000-000000000002', 'QA other', 50, 7, 25);
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
do $$
declare i integer; n integer;
begin
  select count(*) into n from public.soil_readings;
  if n <> 1 then raise exception 'RLS isolation failed'; end if;
  begin
    insert into public.soil_readings(user_id, field, moisture, ph, temperature)
    values ('a0000000-0000-4000-8000-000000000002', 'Forbidden', 50, 7, 25);
    raise exception 'Cross-user insert was incorrectly accepted';
  exception when insufficient_privilege then null; end;
  for i in 1..10 loop
    if not public.consume_scan_quota() then raise exception 'Quota rejected allowed request'; end if;
  end loop;
  if public.consume_scan_quota() then raise exception 'Quota accepted eleventh request'; end if;
  begin
    update public.scan_usage set attempts = 1;
    raise exception 'Quota tampering incorrectly allowed';
  exception when insufficient_privilege then null; end;
end;
$$;
reset role;
rollback;
select 'PASS: owner isolation, cross-user write rejection, ten-attempt quota, quota tamper protection. All QA data rolled back.' as verification;
