create table public.tile_members (
  tile_id uuid not null references public.tiles (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('viewer', 'editor')),
  via_link boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (tile_id, user_id)
);

create index tile_members_user_id_idx
  on public.tile_members (user_id, created_at desc);

create table public.tile_links (
  tile_id uuid primary key references public.tiles (id) on delete cascade,
  access text not null default 'off' check (access in ('off', 'view', 'edit')),
  token uuid not null unique default gen_random_uuid()
);

alter table public.tile_members enable row level security;
alter table public.tile_links enable row level security;

create function private.owns_tile(tile uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.tiles
    where id = tile and user_id = (select auth.uid()) and deleted_at is null
  );
$$;

revoke all on function private.owns_tile(uuid) from public, anon;
grant execute on function private.owns_tile(uuid) to authenticated;

create policy "Owners and members see memberships"
  on public.tile_members for select to authenticated
  using (user_id = (select auth.uid()) or private.owns_tile(tile_id));

create policy "Owners see their share links"
  on public.tile_links for select to authenticated
  using (private.owns_tile(tile_id));

revoke all on public.tile_members from anon, authenticated;
revoke all on public.tile_links from anon, authenticated;
grant select on public.tile_members to authenticated;
grant select on public.tile_links to authenticated;

create function public.share_tile(tile uuid, who text, what text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  person uuid;
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
  insert into public.tile_members (tile_id, user_id, role)
  values (tile, person, what)
  on conflict (tile_id, user_id)
  do update set role = excluded.role, via_link = false;
  return person;
end;
$$;

create function public.set_tile_member_role(tile uuid, member uuid, what text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.owns_tile(tile) then
    raise exception 'not_owner';
  end if;
  if what not in ('viewer', 'editor') then
    raise exception 'bad_role';
  end if;
  update public.tile_members
  set role = what, via_link = false
  where tile_id = tile and user_id = member;
end;
$$;

create function public.remove_tile_member(tile uuid, member uuid)
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
end;
$$;

create function public.set_tile_link_access(tile uuid, what text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  link uuid;
begin
  if not private.owns_tile(tile) then
    raise exception 'not_owner';
  end if;
  if what not in ('off', 'view', 'edit') then
    raise exception 'bad_access';
  end if;
  insert into public.tile_links as l (tile_id, access)
  values (tile, what)
  on conflict (tile_id) do update set access = excluded.access
  returning l.token into link;
  if what = 'off' then
    delete from public.tile_members where tile_id = tile and via_link;
  else
    update public.tile_members
    set role = case what when 'edit' then 'editor' else 'viewer' end
    where tile_id = tile and via_link;
  end if;
  return link;
end;
$$;

create function public.reset_tile_link(tile uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  link uuid;
begin
  if not private.owns_tile(tile) then
    raise exception 'not_owner';
  end if;
  insert into public.tile_links as l (tile_id)
  values (tile)
  on conflict (tile_id) do update set token = gen_random_uuid()
  returning l.token into link;
  delete from public.tile_members where tile_id = tile and via_link;
  return link;
end;
$$;

create function public.tile_people(tile uuid)
returns table (
  user_id uuid,
  username text,
  display_name text,
  avatar_kind text,
  avatar_path text,
  provider_avatar_url text,
  role text,
  via_link boolean
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
      p.provider_avatar_url, m.role, m.via_link
    from public.tile_members m
    join public.profiles p on p.id = m.user_id
    where m.tile_id = tile
    order by m.created_at;
end;
$$;

create function public.join_tile_by_link(link uuid)
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
  insert into public.tile_members (tile_id, user_id, role, via_link)
  values (found_tile, person, case what when 'edit' then 'editor' else 'viewer' end, true)
  on conflict (tile_id, user_id) do update set role = excluded.role
  where public.tile_members.via_link;
  return found_tile;
end;
$$;

revoke all on function public.share_tile(uuid, text, text) from public, anon;
revoke all on function public.set_tile_member_role(uuid, uuid, text) from public, anon;
revoke all on function public.remove_tile_member(uuid, uuid) from public, anon;
revoke all on function public.set_tile_link_access(uuid, text) from public, anon;
revoke all on function public.reset_tile_link(uuid) from public, anon;
revoke all on function public.tile_people(uuid) from public, anon;
revoke all on function public.join_tile_by_link(uuid) from public, anon;
grant execute on function public.share_tile(uuid, text, text) to authenticated;
grant execute on function public.set_tile_member_role(uuid, uuid, text) to authenticated;
grant execute on function public.remove_tile_member(uuid, uuid) to authenticated;
grant execute on function public.set_tile_link_access(uuid, text) to authenticated;
grant execute on function public.reset_tile_link(uuid) to authenticated;
grant execute on function public.tile_people(uuid) to authenticated;
grant execute on function public.join_tile_by_link(uuid) to authenticated;
