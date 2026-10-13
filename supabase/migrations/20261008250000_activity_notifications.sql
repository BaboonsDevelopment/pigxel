alter table public.notifications
  drop constraint notifications_kind_check,
  add constraint notifications_kind_check
    check (kind in ('art_rejected', 'like', 'comment', 'save', 'remix', 'download')),
  add column actor_id uuid references public.profiles (id) on delete cascade,
  add column comment_id uuid references public.tile_comments (id) on delete cascade,
  add column detail text;

create unique index notifications_once_per_actor_idx
  on public.notifications (user_id, kind, tile_id, actor_id)
  where kind in ('like', 'save', 'remix', 'download');

create function private.notify_tile_owner(
  tile uuid,
  actor uuid,
  what text,
  comment uuid default null,
  body text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner uuid;
  title text;
begin
  select user_id, name into owner, title from public.tiles where id = tile;
  if owner is null or actor is null or owner = actor then
    return;
  end if;
  insert into public.notifications (user_id, kind, tile_id, tile_name, actor_id, comment_id, detail)
  values (owner, what, tile, title, actor, comment, body)
  on conflict do nothing;
end;
$$;

create function private.forget_tile_notification(tile uuid, actor uuid, what text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.notifications
  where kind = what and tile_id = tile and actor_id = actor;
$$;

create function private.notify_like()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.notify_tile_owner(new.tile_id, new.user_id, 'like');
  else
    perform private.forget_tile_notification(old.tile_id, old.user_id, 'like');
  end if;
  return null;
end;
$$;

create trigger tile_likes_notify
  after insert or delete on public.tile_likes
  for each row execute function private.notify_like();

create function private.notify_save()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.notify_tile_owner(new.tile_id, new.user_id, 'save');
  else
    perform private.forget_tile_notification(old.tile_id, old.user_id, 'save');
  end if;
  return null;
end;
$$;

create trigger saved_tiles_notify
  after insert or delete on public.saved_tiles
  for each row execute function private.notify_save();

create function private.notify_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.notify_tile_owner(new.tile_id, new.user_id, 'comment', new.id, left(new.body, 140));
  elsif new.body is distinct from old.body then
    update public.notifications set detail = left(new.body, 140) where comment_id = new.id;
  end if;
  return null;
end;
$$;

create trigger tile_comments_notify
  after insert or update of body on public.tile_comments
  for each row execute function private.notify_comment();

create function private.notify_download()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.notify_tile_owner(new.tile_id, new.user_id, 'download');
  return null;
end;
$$;

create trigger tile_download_people_notify
  after insert on public.tile_download_people
  for each row execute function private.notify_download();

create function private.notify_remix()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.remix_of_tile is not null
    and (tg_op = 'INSERT' or new.remix_of_tile is distinct from old.remix_of_tile) then
    perform private.notify_tile_owner(new.remix_of_tile, new.user_id, 'remix');
  end if;
  return null;
end;
$$;

create trigger tiles_notify_remix
  after insert or update of remix_of_tile on public.tiles
  for each row execute function private.notify_remix();

revoke all on function private.notify_tile_owner(uuid, uuid, text, uuid, text) from public;
revoke all on function private.forget_tile_notification(uuid, uuid, text) from public;
