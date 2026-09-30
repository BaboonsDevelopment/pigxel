-- The profile page: a premium badge, following artists, a daily activity
-- heatmap, and four pinned arts instead of six.

-- When the person became premium; null on Free. Only the server sets it
-- (billing, later), so it stays out of the columns people may update.
alter table public.profiles add column premium_since timestamptz;

-- Following: one row per follower and artist they follow.
create table public.follows (
  follower_id uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  followee_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

create index follows_followee_id_idx on public.follows (followee_id);

alter table public.follows enable row level security;

-- Followers show on profiles you may see; the profiles check applies its own RLS.
create policy "Follows of visible profiles are visible"
  on public.follows for select to authenticated
  using (
    (select auth.uid()) = follower_id
    or exists (select 1 from public.profiles where profiles.id = followee_id)
  );

create policy "People follow public profiles"
  on public.follows for insert to authenticated
  with check (
    (select auth.uid()) = follower_id
    and exists (
      select 1 from public.profiles
      where profiles.id = followee_id and profiles.visibility = 'public'
    )
  );

create policy "People unfollow"
  on public.follows for delete to authenticated
  using ((select auth.uid()) = follower_id);

revoke all on public.follows from anon, authenticated;
grant select, delete on public.follows to authenticated;
grant insert (followee_id) on public.follows to authenticated;

-- Which tiles each person worked on each day (UTC), for the activity heatmap.
-- tile_id isn't a foreign key, so deleting a tile keeps its history.
create table public.tile_activity (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  tile_id uuid not null,
  primary key (user_id, day, tile_id)
);

alter table public.tile_activity enable row level security;

create policy "Activity of visible profiles is visible"
  on public.tile_activity for select to authenticated
  using (exists (select 1 from public.profiles where profiles.id = user_id));

-- Rows only come from the trigger below.
revoke all on public.tile_activity from anon, authenticated;
grant select on public.tile_activity to authenticated;

create function private.log_tile_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.tile_activity (user_id, day, tile_id)
  values (new.user_id, (now() at time zone 'utc')::date, new.id)
  on conflict do nothing;
  return new;
end;
$$;

revoke all on function private.log_tile_activity() from public, anon, authenticated;

-- Saving a tile sets updated_at; publishing or pinning it doesn't, so they don't count.
create trigger tiles_log_activity
  after insert or update of updated_at on public.tiles
  for each row execute function private.log_tile_activity();

-- The days we can tell from existing tiles: when each was made and last saved.
insert into public.tile_activity (user_id, day, tile_id)
select user_id, (created_at at time zone 'utc')::date, id from public.tiles
union
select user_id, (updated_at at time zone 'utc')::date, id from public.tiles
on conflict do nothing;

-- Arts worked on per day over the last year, as far as the viewer may see.
create function public.profile_activity(profile_id uuid)
returns table (day date, arts integer)
language sql
stable
security invoker
set search_path = ''
as $$
  select day, count(*)::integer
  from public.tile_activity
  where user_id = profile_id
    and day > (now() at time zone 'utc')::date - 371
  group by day;
$$;

revoke all on function public.profile_activity(uuid) from public, anon;
grant execute on function public.profile_activity(uuid) to authenticated;

-- Four pinned arts. Pins past the fourth are dropped first.
update public.tiles set pin_order = null where pin_order > 4;
alter table public.tiles drop constraint tiles_pin_order_check;
alter table public.tiles
  add constraint tiles_pin_order_check check (pin_order between 1 and 4);
