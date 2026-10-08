create function public.remix_count(tile uuid)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)
  from public.tiles
  where remix_of_tile = tile
    and exists (
      select 1 from public.tiles original
      where original.id = tile and original.visibility = 'public'
    );
$$;

revoke execute on function public.remix_count(uuid) from public;
grant execute on function public.remix_count(uuid) to anon, authenticated;
