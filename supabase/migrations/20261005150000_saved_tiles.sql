create table public.saved_tiles (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tile_id uuid not null references public.tiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, tile_id)
);

create index saved_tiles_user_id_created_at_idx on public.saved_tiles (user_id, created_at desc);

alter table public.saved_tiles enable row level security;

create policy "Saved arts are visible to whoever saved them"
  on public.saved_tiles for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "People save published arts"
  on public.saved_tiles for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.tiles
      where tiles.id = tile_id and tiles.visibility = 'public'
    )
  );

create policy "People unsave arts"
  on public.saved_tiles for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.saved_tiles from anon, authenticated;
grant select, delete on public.saved_tiles to authenticated;
grant insert (tile_id) on public.saved_tiles to authenticated;
