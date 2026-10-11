create table public.editor_keymaps (
  user_id uuid primary key default auth.uid()
    references auth.users (id) on delete cascade,
  keys jsonb not null,
  updated_at timestamptz not null default now(),
  check (pg_column_size(keys) < 32768)
);

alter table public.editor_keymaps enable row level security;

create policy "People keep their own shortcuts"
  on public.editor_keymaps for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.editor_keymaps from anon, authenticated;
grant select, insert, update on public.editor_keymaps to authenticated;
