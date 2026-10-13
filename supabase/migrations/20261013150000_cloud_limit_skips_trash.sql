-- Tiles in the trash (deleted_at set) don't count toward the plan's Pigxel
-- cloud limit: deleting a tile frees its slot straight away, even before the
-- trash is emptied.
create or replace function private.enforce_cloud_tile_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  tile_limit integer;
begin
  -- One insert at a time per person, so two saves can't both slip under.
  perform pg_advisory_xact_lock(hashtext('cloud_tiles:' || new.user_id::text));
  tile_limit := private.cloud_tile_limit(new.user_id);
  if (
    select count(*) from public.tiles
    where user_id = new.user_id and deleted_at is null
  ) >= tile_limit then
    raise exception 'cloud_tile_limit:%', tile_limit
      using errcode = 'P0001',
        hint = 'The plan''s Pigxel cloud limit is reached.';
  end if;
  return new;
end;
$$;

revoke all on function private.enforce_cloud_tile_limit() from public, anon;
grant execute on function private.enforce_cloud_tile_limit() to authenticated, service_role;
