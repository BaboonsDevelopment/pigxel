create function public.stop_sharing_tile(tile uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.owns_tile(tile) then
    raise exception 'not_owner';
  end if;
  delete from public.tile_members where tile_id = tile;
  delete from public.notifications where tile_id = tile and kind = 'share_invite';
  update public.tile_links set access = 'off', token = gen_random_uuid()
  where tile_id = tile;
end;
$$;

revoke all on function public.stop_sharing_tile(uuid) from public, anon;
grant execute on function public.stop_sharing_tile(uuid) to authenticated;
