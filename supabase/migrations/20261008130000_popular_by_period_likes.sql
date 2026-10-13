create or replace function public.popular_tiles(since timestamptz)
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
  where tiles.visibility = 'public'
  order by recent.likes desc, tiles.published_at desc, tiles.id;
$$;
