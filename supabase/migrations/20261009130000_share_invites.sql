alter table public.tile_members add column accepted_at timestamptz;

update public.tile_members set accepted_at = created_at;

alter table public.notifications
  drop constraint notifications_kind_check,
  add constraint notifications_kind_check
    check (kind in ('art_rejected', 'like', 'comment', 'save', 'remix', 'download', 'share_invite'));

create unique index notifications_one_invite_idx
  on public.notifications (user_id, tile_id)
  where kind = 'share_invite';

create or replace function public.share_tile(tile uuid, who text, what text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  person uuid;
  title text;
  joined timestamptz;
begin
  if not private.owns_tile(tile) then
    raise exception 'not_owner';
  end if;
  if what not in ('viewer', 'editor') then
    raise exception 'bad_role';
  end if;
  select id into person from public.profiles
  where username = lower(btrim(ltrim(btrim(who), '@')));
  if person is null then
    raise exception 'no_user';
  end if;
  if person = (select auth.uid()) then
    raise exception 'self';
  end if;
  if exists (
    select 1 from public.blocks
    where (blocker_id = (select auth.uid()) and blocked_id = person)
       or (blocker_id = person and blocked_id = (select auth.uid()))
  ) then
    raise exception 'blocked';
  end if;
  insert into public.tile_members as m (tile_id, user_id, role)
  values (tile, person, what)
  on conflict (tile_id, user_id)
  do update set role = excluded.role, via_link = false
  returning m.accepted_at into joined;
  if joined is null then
    select name into title from public.tiles where id = tile;
    insert into public.notifications (user_id, kind, tile_id, tile_name, actor_id, detail)
    values (person, 'share_invite', tile, title, (select auth.uid()), what)
    on conflict (user_id, tile_id) where kind = 'share_invite'
    do update set detail = excluded.detail, tile_name = excluded.tile_name;
  end if;
  return person;
end;
$$;

create or replace function public.remove_tile_member(tile uuid, member uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.owns_tile(tile) then
    raise exception 'not_owner';
  end if;
  delete from public.tile_members where tile_id = tile and user_id = member;
  delete from public.notifications
  where user_id = member and tile_id = tile and kind = 'share_invite';
end;
$$;

create or replace function public.join_tile_by_link(link uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  person uuid := auth.uid();
  found_tile uuid;
  owner uuid;
  what text;
begin
  if person is null then
    raise exception 'not_signed_in';
  end if;
  select l.tile_id, t.user_id, l.access into found_tile, owner, what
  from public.tile_links l
  join public.tiles t on t.id = l.tile_id
  where l.token = link and l.access <> 'off' and t.deleted_at is null;
  if found_tile is null then
    return null;
  end if;
  if owner = person then
    return found_tile;
  end if;
  if exists (
    select 1 from public.blocks
    where (blocker_id = owner and blocked_id = person)
       or (blocker_id = person and blocked_id = owner)
  ) then
    return null;
  end if;
  insert into public.tile_members as m (tile_id, user_id, role, via_link, accepted_at)
  values (found_tile, person, case what when 'edit' then 'editor' else 'viewer' end, true, now())
  on conflict (tile_id, user_id) do update
  set role = case when m.via_link then excluded.role else m.role end,
    accepted_at = coalesce(m.accepted_at, now());
  delete from public.notifications
  where user_id = person and tile_id = found_tile and kind = 'share_invite';
  return found_tile;
end;
$$;

create function public.respond_to_share_invite(tile uuid, accept boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  person uuid := auth.uid();
begin
  if not exists (
    select 1 from public.tile_members m
    join public.tiles t on t.id = m.tile_id
    where m.tile_id = tile and m.user_id = person
      and m.accepted_at is null and t.deleted_at is null
  ) then
    delete from public.notifications
    where user_id = person and tile_id = tile and kind = 'share_invite';
    return false;
  end if;
  if accept then
    update public.tile_members set accepted_at = now()
    where tile_id = tile and user_id = person;
  else
    delete from public.tile_members where tile_id = tile and user_id = person;
  end if;
  delete from public.notifications
  where user_id = person and tile_id = tile and kind = 'share_invite';
  return true;
end;
$$;

drop function public.tile_people(uuid);

create function public.tile_people(tile uuid)
returns table (
  user_id uuid,
  username text,
  display_name text,
  avatar_kind text,
  avatar_path text,
  provider_avatar_url text,
  role text,
  via_link boolean,
  pending boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.owns_tile(tile) then
    raise exception 'not_owner';
  end if;
  return query
    select m.user_id, p.username, p.display_name, p.avatar_kind, p.avatar_path,
      p.provider_avatar_url, m.role, m.via_link, m.accepted_at is null
    from public.tile_members m
    join public.profiles p on p.id = m.user_id
    where m.tile_id = tile
    order by m.created_at;
end;
$$;

revoke all on function public.respond_to_share_invite(uuid, boolean) from public, anon;
revoke all on function public.tile_people(uuid) from public, anon;
grant execute on function public.respond_to_share_invite(uuid, boolean) to authenticated;
grant execute on function public.tile_people(uuid) to authenticated;
