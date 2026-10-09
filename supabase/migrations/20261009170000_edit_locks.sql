create table public.tile_edit_locks (
  tile_id uuid primary key references public.tiles (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  heartbeat_at timestamptz not null default now()
);

alter table public.tile_edit_locks enable row level security;

revoke all on public.tile_edit_locks from anon, authenticated;

create function private.edit_lock_holder(tile uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select user_id from public.tile_edit_locks
  where tile_id = tile
    and user_id <> (select auth.uid())
    and heartbeat_at > now() - interval '45 seconds';
$$;

revoke all on function private.edit_lock_holder(uuid) from public, anon;
grant execute on function private.edit_lock_holder(uuid) to authenticated;

create function public.claim_tile_edit(tile uuid)
returns table (username text, display_name text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  holder uuid;
begin
  if not private.owns_tile(tile)
    and private.member_role(tile) is distinct from 'editor' then
    raise exception 'no_access';
  end if;
  perform 1 from public.tiles where id = tile for update;
  holder := private.edit_lock_holder(tile);
  if holder is not null then
    return query
      select p.username, p.display_name from public.profiles p where p.id = holder;
    return;
  end if;
  insert into public.tile_edit_locks as l (tile_id, user_id, heartbeat_at)
  values (tile, (select auth.uid()), now())
  on conflict (tile_id) do update
  set user_id = excluded.user_id, heartbeat_at = excluded.heartbeat_at;
end;
$$;

create function public.release_tile_edit(tile uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.tile_edit_locks
  where tile_id = tile and user_id = (select auth.uid());
$$;

revoke all on function public.claim_tile_edit(uuid) from public, anon;
revoke all on function public.release_tile_edit(uuid) from public, anon;
grant execute on function public.claim_tile_edit(uuid) to authenticated;
grant execute on function public.release_tile_edit(uuid) to authenticated;

create function private.guard_edit_lock()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null
    and private.edit_lock_holder(old.id) is not null then
    raise exception 'locked' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function private.guard_edit_lock() from public, anon, authenticated;

create trigger tiles_guard_edit_lock
  before update of updated_at on public.tiles
  for each row execute function private.guard_edit_lock();
