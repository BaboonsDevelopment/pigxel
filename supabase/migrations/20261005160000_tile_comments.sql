create table public.tile_comments (
  id uuid primary key default gen_random_uuid(),
  tile_id uuid not null references public.tiles (id) on delete cascade,
  user_id uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);

create index tile_comments_tile_id_created_at_idx
  on public.tile_comments (tile_id, created_at desc);

alter table public.tile_comments enable row level security;

create policy "Comments on visible arts are visible"
  on public.tile_comments for select to anon, authenticated
  using (exists (select 1 from public.tiles where tiles.id = tile_id));

create policy "People comment on published arts"
  on public.tile_comments for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.tiles
      where tiles.id = tile_id and tiles.visibility = 'public'
    )
  );

create policy "People delete their comments and comments on their arts"
  on public.tile_comments for delete to authenticated
  using (
    (select auth.uid()) = user_id
    or exists (
      select 1 from public.tiles
      where tiles.id = tile_id and tiles.user_id = (select auth.uid())
    )
  );

revoke all on public.tile_comments from anon, authenticated;
grant select on public.tile_comments to anon, authenticated;
grant delete on public.tile_comments to authenticated;
grant insert (tile_id, body) on public.tile_comments to authenticated;
