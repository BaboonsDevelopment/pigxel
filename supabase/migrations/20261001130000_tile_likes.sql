-- Likes on published arts: one row per person and art they like, so no one
-- can like the same art twice.
create table public.tile_likes (
  user_id uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  tile_id uuid not null references public.tiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, tile_id)
);

create index tile_likes_tile_id_idx on public.tile_likes (tile_id);

alter table public.tile_likes enable row level security;

-- Likes show on arts you may see; the tiles check applies its own RLS.
create policy "Likes of visible tiles are visible"
  on public.tile_likes for select to authenticated
  using (
    (select auth.uid()) = user_id
    or exists (select 1 from public.tiles where tiles.id = tile_id)
  );

create policy "People like published arts"
  on public.tile_likes for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.tiles
      where tiles.id = tile_id and tiles.visibility = 'public'
    )
  );

create policy "People unlike"
  on public.tile_likes for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.tile_likes from anon, authenticated;
grant select, delete on public.tile_likes to authenticated;
grant insert (tile_id) on public.tile_likes to authenticated;
