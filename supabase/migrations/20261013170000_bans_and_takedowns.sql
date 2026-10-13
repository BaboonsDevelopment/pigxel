-- Moderation by the team, for reported arts and people. Only the service
-- role reads or writes these tables.
--
-- A takedown takes one art off Explore for good: the content check rejects
-- it from then on, so its owner can't publish it again. They keep the tile.
--
-- A ban removes a person from the community: the app unpublishes their arts
-- and deletes their comments, they can't comment any more, and the content
-- check rejects all their arts. They keep their own tiles.

create table public.tile_takedowns (
  tile_id uuid primary key references public.tiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.tile_takedowns enable row level security;

revoke all on public.tile_takedowns from anon, authenticated;

create table public.bans (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.bans enable row level security;

revoke all on public.bans from anon, authenticated;

create function private.is_banned(person uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.bans where user_id = person);
$$;

revoke all on function private.is_banned(uuid) from public, anon;
grant execute on function private.is_banned(uuid) to authenticated;

create policy "Banned people can't comment"
  on public.tile_comments as restrictive for insert to authenticated
  with check (not private.is_banned((select auth.uid())));
