create table public.comment_reports (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.tile_comments (id) on delete cascade,
  reporter_id uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (comment_id, reporter_id)
);

create index comment_reports_created_at_idx
  on public.comment_reports (created_at desc);

alter table public.comment_reports enable row level security;

create policy "People report comments they can see"
  on public.comment_reports for insert to authenticated
  with check (
    (select auth.uid()) = reporter_id
    and exists (
      select 1 from public.tile_comments
      where tile_comments.id = comment_id
        and tile_comments.user_id <> (select auth.uid())
    )
  );

revoke all on public.comment_reports from anon, authenticated;
grant insert (comment_id) on public.comment_reports to authenticated;
