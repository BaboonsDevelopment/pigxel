-- Arts published since `since` (this week, month or year), most liked in
-- that time first, then newest. Returns tiles, so a request can bring
-- authors and likes along. Runs as the caller, so row-level security still
-- leaves out private ones.
create function public.popular_tiles(since timestamptz)
returns setof public.tiles
language sql
stable
security invoker
set search_path = ''
as $$
  select tiles.*
  from public.tiles
  left join lateral (
    select count(*) as likes
    from public.tile_likes
    where tile_likes.tile_id = tiles.id and tile_likes.created_at >= since
  ) recent on true
  where tiles.visibility = 'public' and tiles.published_at >= since
  order by recent.likes desc, tiles.published_at desc, tiles.id;
$$;

create index tile_likes_tile_id_created_at_idx
  on public.tile_likes (tile_id, created_at);
drop index public.tile_likes_tile_id_idx;

revoke execute on function public.popular_tiles(timestamptz) from public, anon;
grant execute on function public.popular_tiles(timestamptz) to authenticated;
