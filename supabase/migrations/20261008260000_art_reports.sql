create table public.art_reports (
  id uuid primary key default gen_random_uuid(),
  tile_id uuid not null references public.tiles (id) on delete cascade,
  reporter_id uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (tile_id, reporter_id)
);

create index art_reports_created_at_idx
  on public.art_reports (created_at desc);

alter table public.art_reports enable row level security;

create policy "People report public arts by others"
  on public.art_reports for insert to authenticated
  with check (
    (select auth.uid()) = reporter_id
    and exists (
      select 1 from public.tiles
      where tiles.id = tile_id
        and tiles.visibility = 'public'
        and tiles.user_id <> (select auth.uid())
    )
  );

revoke all on public.art_reports from anon, authenticated;
grant insert (tile_id) on public.art_reports to authenticated;
