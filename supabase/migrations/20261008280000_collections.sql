create table public.collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  description text not null default '' check (char_length(description) <= 300),
  created_at timestamptz not null default now()
);

create index collections_user_id_created_at_idx
  on public.collections (user_id, created_at desc);

create table public.collection_items (
  collection_id uuid not null references public.collections (id) on delete cascade,
  tile_id uuid not null references public.tiles (id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (collection_id, tile_id)
);

create index collection_items_tile_id_idx on public.collection_items (tile_id);

alter table public.collections enable row level security;
alter table public.collection_items enable row level security;

create policy "Collections of visible profiles are visible"
  on public.collections for select to anon, authenticated
  using (exists (select 1 from public.profiles where profiles.id = user_id));

create policy "People create their own collections"
  on public.collections for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "People edit their own collections"
  on public.collections for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "People delete their own collections"
  on public.collections for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.collections from anon, authenticated;
grant select on public.collections to anon, authenticated;
grant insert (name, description), update (name, description), delete
  on public.collections to authenticated;

create policy "Items of visible collections are visible"
  on public.collection_items for select to anon, authenticated
  using (exists (select 1 from public.collections where collections.id = collection_id));

create policy "People add public arts to their collections"
  on public.collection_items for insert to authenticated
  with check (
    exists (
      select 1 from public.collections
      where collections.id = collection_id
        and collections.user_id = (select auth.uid())
    )
    and exists (
      select 1 from public.tiles
      where tiles.id = tile_id and tiles.visibility = 'public'
    )
  );

create policy "People remove arts from their collections"
  on public.collection_items for delete to authenticated
  using (
    exists (
      select 1 from public.collections
      where collections.id = collection_id
        and collections.user_id = (select auth.uid())
    )
  );

revoke all on public.collection_items from anon, authenticated;
grant select on public.collection_items to anon, authenticated;
grant insert (collection_id, tile_id), delete on public.collection_items to authenticated;
