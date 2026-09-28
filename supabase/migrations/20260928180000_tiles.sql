-- Tiles kept in Pigxel cloud. The pixels live in Storage as
-- tiles/<user id>/<tile id>.pigxel; this table holds what the tile list needs.
create table public.tiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  width integer not null check (width between 1 and 256),
  height integer not null check (height between 1 and 256),
  background text not null default 'transparent'
    check (background in ('transparent', 'white', 'black')),
  -- A small PNG data URL for the tile list.
  thumbnail text check (char_length(thumbnail) <= 50000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tiles_user_id_updated_at_idx on public.tiles (user_id, updated_at desc);

-- Each person can only see and change their own tiles.
alter table public.tiles enable row level security;

create policy "Tiles are visible to their owner"
  on public.tiles for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "People create their own tiles"
  on public.tiles for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "People update their own tiles"
  on public.tiles for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "People delete their own tiles"
  on public.tiles for delete to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.tiles to authenticated;
revoke all on public.tiles from anon;

-- The tile files: private, .pigxel only, at most 1 MB (a 256×256 tile is ~350 KB).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tiles', 'tiles', false, 1048576, array['application/vnd.pigxel+json'])
on conflict (id) do nothing;

-- Files sit under a folder named after their owner's user id.
create policy "Tile files are visible to their owner"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'tiles'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "People upload their own tile files"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'tiles'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "People replace their own tile files"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'tiles'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'tiles'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "People delete their own tile files"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'tiles'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
