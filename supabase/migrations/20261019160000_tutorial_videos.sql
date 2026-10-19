create table public.tutorial_videos (
  slug text primary key check (char_length(slug) between 1 and 100),
  youtube_id text not null check (youtube_id ~ '^[A-Za-z0-9_-]{11}$')
);
alter table public.tutorial_videos enable row level security;
create policy "Signed in people read tutorial video links" on public.tutorial_videos
  for select to authenticated using (true);
create policy "Admins attach tutorial videos" on public.tutorial_videos
  for insert to authenticated with check (private.is_admin());
create policy "Admins update tutorial videos" on public.tutorial_videos
  for update to authenticated using (private.is_admin()) with check (private.is_admin());
create policy "Admins remove tutorial videos" on public.tutorial_videos
  for delete to authenticated using (private.is_admin());
revoke all on public.tutorial_videos from anon, authenticated;
grant select, insert, update, delete on public.tutorial_videos to authenticated;
