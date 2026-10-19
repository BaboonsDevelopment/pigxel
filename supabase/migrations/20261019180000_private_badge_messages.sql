-- Displaying a badge must not publish its personal message through the API.
revoke select on public.profile_badges from anon, authenticated;
grant select (id, sender_id, recipient_id, tile_id, label, visible, created_at)
  on public.profile_badges to anon, authenticated;

create function public.received_badge_messages()
returns table (id uuid, message text)
language sql stable security definer set search_path = '' as $$
  select b.id, b.message from public.profile_badges b
  where b.recipient_id = (select auth.uid());
$$;
revoke all on function public.received_badge_messages() from public, anon;
grant execute on function public.received_badge_messages() to authenticated;
