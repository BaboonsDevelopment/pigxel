create function public.leave_tile(tile uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.tile_members
  where tile_id = tile and user_id = (select auth.uid());
$$;

revoke all on function public.leave_tile(uuid) from public, anon;
grant execute on function public.leave_tile(uuid) to authenticated;
