create table public.blocks (
  blocker_id uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index blocks_blocked_id_idx on public.blocks (blocked_id);

alter table public.blocks enable row level security;

create policy "People see who they blocked"
  on public.blocks for select to authenticated
  using ((select auth.uid()) = blocker_id);

create policy "People block others"
  on public.blocks for insert to authenticated
  with check ((select auth.uid()) = blocker_id);

create policy "People unblock"
  on public.blocks for delete to authenticated
  using ((select auth.uid()) = blocker_id);

revoke all on public.blocks from anon, authenticated;
grant select, delete on public.blocks to authenticated;
grant insert (blocked_id) on public.blocks to authenticated;

create function private.is_blocked(other uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = (select auth.uid()) and blocked_id = other)
       or (blocker_id = other and blocked_id = (select auth.uid()))
  );
$$;

revoke all on function private.is_blocked(uuid) from public, anon;
grant execute on function private.is_blocked(uuid) to authenticated;

create function private.cut_ties()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.follows
  where (follower_id = new.blocker_id and followee_id = new.blocked_id)
     or (follower_id = new.blocked_id and followee_id = new.blocker_id);
  delete from public.notifications
  where (user_id = new.blocker_id and actor_id = new.blocked_id)
     or (user_id = new.blocked_id and actor_id = new.blocker_id);
  return null;
end;
$$;

revoke all on function private.cut_ties() from public, anon, authenticated;

create trigger blocks_cut_ties
  after insert on public.blocks
  for each row execute function private.cut_ties();

create policy "Blocked people's arts stay hidden"
  on public.tiles as restrictive for select to authenticated
  using (not private.is_blocked(user_id));

create policy "Blocked people's comments stay hidden"
  on public.tile_comments as restrictive for select to authenticated
  using (not private.is_blocked(user_id));

create policy "Blocked people can't follow"
  on public.follows as restrictive for insert to authenticated
  with check (not private.is_blocked(followee_id));

create or replace function private.notify_tile_owner(
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
  if exists (
    select 1 from public.blocks
    where (blocker_id = owner and blocked_id = actor)
       or (blocker_id = actor and blocked_id = owner)
  ) then
    return;
  end if;
  insert into public.notifications (user_id, kind, tile_id, tile_name, actor_id, comment_id, detail)
  values (owner, what, tile, title, actor, comment, body)
  on conflict do nothing;
end;
$$;
