alter table public.notifications
  drop constraint notifications_kind_check,
  add constraint notifications_kind_check
    check (kind in ('art_rejected', 'like', 'comment', 'save', 'remix', 'download', 'share_invite', 'share_role', 'share_removed'));

create function private.notify_membership_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner uuid;
  title text;
begin
  select user_id, name into owner, title from public.tiles where id = old.tile_id;
  if owner is null
    or not exists (select 1 from public.profiles where id = old.user_id) then
    return null;
  end if;
  if tg_op = 'UPDATE' then
    if new.role = old.role then
      return null;
    end if;
    if old.accepted_at is null then
      update public.notifications set detail = new.role
      where user_id = old.user_id and tile_id = old.tile_id and kind = 'share_invite';
      return null;
    end if;
    insert into public.notifications (user_id, kind, tile_id, tile_name, actor_id, detail)
    values (old.user_id, 'share_role', old.tile_id, title, owner, new.role);
    return null;
  end if;
  delete from public.notifications
  where user_id = old.user_id and tile_id = old.tile_id
    and kind in ('share_invite', 'share_role');
  if old.accepted_at is null or (select auth.uid()) = old.user_id then
    return null;
  end if;
  insert into public.notifications (user_id, kind, tile_id, tile_name, actor_id)
  values (old.user_id, 'share_removed', old.tile_id, title, owner);
  return null;
end;
$$;

revoke all on function private.notify_membership_change() from public, anon, authenticated;

create trigger tile_members_notify
  after update of role or delete on public.tile_members
  for each row execute function private.notify_membership_change();
