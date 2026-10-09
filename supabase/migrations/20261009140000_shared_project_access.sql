create function private.member_role(tile uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select m.role
  from public.tile_members m
  join public.tiles t on t.id = m.tile_id
  where m.tile_id = tile
    and m.user_id = (select auth.uid())
    and m.accepted_at is not null
    and t.deleted_at is null;
$$;

revoke all on function private.member_role(uuid) from public, anon;
grant execute on function private.member_role(uuid) to authenticated;

create function private.shared_file_role(path text)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  tile uuid;
begin
  if path !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.pigxel$' then
    return null;
  end if;
  tile := split_part(split_part(path, '/', 2), '.', 1)::uuid;
  if not exists (
    select 1 from public.tiles
    where id = tile and user_id::text = split_part(path, '/', 1)
  ) then
    return null;
  end if;
  return private.member_role(tile);
exception when invalid_text_representation then
  return null;
end;
$$;

revoke all on function private.shared_file_role(text) from public, anon;
grant execute on function private.shared_file_role(text) to authenticated;

create policy "Members see projects shared with them"
  on public.tiles for select to authenticated
  using (private.member_role(id) is not null);

create policy "Editors save projects shared with them"
  on public.tiles for update to authenticated
  using (private.member_role(id) = 'editor')
  with check (private.member_role(id) = 'editor');

create function private.guard_shared_edit()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  kept public.tiles;
begin
  if (select auth.uid()) is null or (select auth.uid()) = old.user_id then
    return new;
  end if;
  kept := old;
  kept.width := new.width;
  kept.height := new.height;
  kept.background := new.background;
  kept.frame_count := new.frame_count;
  kept.thumbnail := new.thumbnail;
  kept.updated_at := new.updated_at;
  return kept;
end;
$$;

revoke all on function private.guard_shared_edit() from public, anon, authenticated;

create trigger tiles_guard_shared_edit
  before update on public.tiles
  for each row execute function private.guard_shared_edit();

create policy "Members open shared project files"
  on storage.objects for select to authenticated
  using (bucket_id = 'tiles' and private.shared_file_role(name) is not null);

create policy "Editors save shared project files"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'tiles' and private.shared_file_role(name) = 'editor');

create policy "Editors replace shared project files"
  on storage.objects for update to authenticated
  using (bucket_id = 'tiles' and private.shared_file_role(name) = 'editor')
  with check (bucket_id = 'tiles' and private.shared_file_role(name) = 'editor');
