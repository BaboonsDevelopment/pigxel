-- Explore can be browsed signed out: guests see the same published arts of
-- public profiles that signed-in people do, with their authors and like
-- counts, and can preview them. They can't like, follow or see anything else.

grant select on public.tiles to anon;
create policy "Guests see public tiles of public profiles"
  on public.tiles for select to anon
  using (
    visibility = 'public'
    and exists (
      select 1 from public.profiles
      where profiles.id = tiles.user_id and profiles.visibility = 'public'
    )
  );

-- Only what a card shows of the author.
grant select (id, username, display_name, avatar_kind, avatar_path, provider_avatar_url, visibility)
  on public.profiles to anon;
create policy "Guests see public profiles"
  on public.profiles for select to anon
  using (visibility = 'public');

-- Enough to count likes, not who gave them.
grant select (tile_id, created_at) on public.tile_likes to anon;
create policy "Guests see likes of visible tiles"
  on public.tile_likes for select to anon
  using (exists (select 1 from public.tiles where tiles.id = tile_id));

grant execute on function public.popular_tiles(timestamptz) to anon;

create policy "Guests read files of published arts"
  on storage.objects for select to anon
  using (
    bucket_id = 'tiles'
    and exists (
      select 1 from public.tiles
      where tiles.visibility = 'public'
        and storage.objects.name = tiles.user_id::text || '/' || tiles.id::text || '.pigxel'
    )
  );
