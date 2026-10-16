create table public.comment_likes (
  user_id uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  comment_id uuid not null references public.tile_comments (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, comment_id)
);

create index comment_likes_comment_id_idx on public.comment_likes (comment_id);

alter table public.tile_comments
  add column like_count integer not null default 0 check (like_count >= 0);

create index tile_comments_top_idx
  on public.tile_comments (tile_id, like_count desc, created_at desc)
  where parent_id is null;

create function private.count_comment_like()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.tile_comments
      set like_count = like_count + 1
      where id = new.comment_id;
  else
    update public.tile_comments
      set like_count = greatest(like_count - 1, 0)
      where id = old.comment_id;
  end if;
  return null;
end;
$$;

create trigger comment_likes_count
  after insert or delete on public.comment_likes
  for each row execute function private.count_comment_like();

alter table public.comment_likes enable row level security;

create policy "People see their own comment likes"
  on public.comment_likes for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "People like comments they can see"
  on public.comment_likes for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and not private.is_banned((select auth.uid()))
    and exists (
      select 1 from public.tile_comments where tile_comments.id = comment_id
    )
  );

create policy "People unlike comments"
  on public.comment_likes for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.comment_likes from anon, authenticated;
grant select on public.comment_likes to anon, authenticated;
grant delete on public.comment_likes to authenticated;
grant insert (comment_id) on public.comment_likes to authenticated;
