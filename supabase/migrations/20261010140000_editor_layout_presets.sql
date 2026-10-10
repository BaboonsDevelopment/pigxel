create table public.editor_layout_presets (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (name in ('Drawing', 'Animation', 'Tiles')),
  layout jsonb not null check (pg_column_size(layout) < 32768),
  updated_at timestamptz not null default now(),
  primary key (user_id, name)
);

alter table public.editor_layout_presets enable row level security;
create policy "People keep their own layout presets"
  on public.editor_layout_presets for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
revoke all on public.editor_layout_presets from anon, authenticated;
grant select, insert, update on public.editor_layout_presets to authenticated;
