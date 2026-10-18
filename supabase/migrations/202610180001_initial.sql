begin;

create table public.scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  field text not null check (char_length(field) between 1 and 80),
  crop_hint text not null default '' check (char_length(crop_hint) <= 80),
  image_path text not null,
  result jsonb not null check (jsonb_typeof(result) = 'object'),
  created_at timestamptz not null default now(),
  check (split_part(image_path, '/', 1) = user_id::text)
);
create index scans_user_created on public.scans(user_id, created_at desc);
alter table public.scans enable row level security;
create policy scans_select_own on public.scans for select to authenticated using ((select auth.uid()) = user_id);
create policy scans_insert_own on public.scans for insert to authenticated with check ((select auth.uid()) = user_id);
revoke all on public.scans from anon, authenticated;
grant select, insert on public.scans to authenticated;

create table public.soil_readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  field text not null check (char_length(field) between 1 and 80),
  moisture numeric not null check (moisture between 0 and 100),
  ph numeric not null check (ph between 0 and 14),
  temperature numeric not null check (temperature between -30 and 80),
  notes text not null default '' check (char_length(notes) <= 1000),
  created_at timestamptz not null default now()
);
create index soil_user_created on public.soil_readings(user_id, created_at desc);
alter table public.soil_readings enable row level security;
create policy soil_select_own on public.soil_readings for select to authenticated using ((select auth.uid()) = user_id);
create policy soil_insert_own on public.soil_readings for insert to authenticated with check ((select auth.uid()) = user_id);
revoke all on public.soil_readings from anon, authenticated;
grant select, insert on public.soil_readings to authenticated;

-- No client writes to quota counters. The atomic function enforces a UTC day.
create table public.scan_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null,
  attempts integer not null check (attempts between 1 and 10),
  primary key(user_id, usage_date)
);
alter table public.scan_usage enable row level security;
revoke all on public.scan_usage from anon, authenticated;

create function public.consume_scan_quota() returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := auth.uid();
  used integer;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  insert into public.scan_usage(user_id, usage_date, attempts)
    values (caller, (now() at time zone 'UTC')::date, 1)
  on conflict (user_id, usage_date) do update
    set attempts = public.scan_usage.attempts + 1
    where public.scan_usage.attempts < 10
  returning attempts into used;
  return used is not null;
end;
$$;
revoke all on function public.consume_scan_quota() from public, anon;
grant execute on function public.consume_scan_quota() to authenticated;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('plant-images', 'plant-images', false, 3145728, array['image/jpeg']);
create policy plant_images_select_own on storage.objects for select to authenticated
  using (bucket_id = 'plant-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy plant_images_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'plant-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy plant_images_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'plant-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

commit;
