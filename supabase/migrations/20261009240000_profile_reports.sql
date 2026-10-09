create table public.profile_reports (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  reporter_id uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (profile_id, reporter_id)
);

create index profile_reports_created_at_idx
  on public.profile_reports (created_at desc);

alter table public.profile_reports enable row level security;

create policy "People report other profiles"
  on public.profile_reports for insert to authenticated
  with check (
    (select auth.uid()) = reporter_id
    and profile_id <> (select auth.uid())
  );

revoke all on public.profile_reports from anon, authenticated;
grant insert (profile_id) on public.profile_reports to authenticated;
