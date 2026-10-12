alter table public.profiles
  add column show_activity boolean not null default true;

grant update (show_activity) on public.profiles to authenticated;

create policy "Hidden activity stays with its owner"
  on public.tile_activity as restrictive for select to anon, authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.profiles
      where profiles.id = tile_activity.user_id and profiles.show_activity
    )
  );
