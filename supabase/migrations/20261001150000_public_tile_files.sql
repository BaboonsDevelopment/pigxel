-- The .pigxel file of a published art can be read by anyone who may see the
-- art, so Explore can preview it in full and play its animation. The tiles
-- check applies its own RLS (public tiles of public profiles, or your own).
create policy "Files of published arts are visible"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'tiles'
    and exists (
      select 1 from public.tiles
      where tiles.visibility = 'public'
        and storage.objects.name = tiles.user_id::text || '/' || tiles.id::text || '.pigxel'
    )
  );
