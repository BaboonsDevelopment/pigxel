-- Artist pages can be viewed signed out, like Explore: guests see a public
-- profile, its published arts, follower count and activity heatmap. Private
-- profiles stay hidden, and guests still can't follow or see who follows whom.

-- The rest of what the profile header shows; rows stay limited to public
-- profiles by "Guests see public profiles".
grant select (bio, links, created_at, premium_since) on public.profiles to anon;

-- "This profile is private" instead of "not found".
grant execute on function public.profile_is_private(text) to anon;

-- Enough to count followers, not who they are.
grant select (followee_id) on public.follows to anon;
create policy "Guests count followers of public profiles"
  on public.follows for select to anon
  using (exists (select 1 from public.profiles where profiles.id = followee_id));

-- The activity heatmap.
grant select on public.tile_activity to anon;
create policy "Guests see activity of public profiles"
  on public.tile_activity for select to anon
  using (exists (select 1 from public.profiles where profiles.id = user_id));
grant execute on function public.profile_activity(uuid) to anon;
