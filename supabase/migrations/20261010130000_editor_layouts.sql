create table public.editor_layouts (
  user_id uuid primary key default auth.uid()
    references auth.users (id) on delete cascade,
  layout jsonb not null,
  updated_at timestamptz not null default now(),
  check (pg_column_size(layout) < 32768)
);

alter table public.editor_layouts enable row level security;

create policy "People keep their own editor layout"
  on public.editor_layouts for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.editor_layouts from anon, authenticated;
grant select, insert, update on public.editor_layouts to authenticated;
