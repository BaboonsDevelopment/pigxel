-- Free keeps 5 arts in Pigxel cloud (was 10). Same numbers as
-- features/billing/pricing.ts; change both together. Tiles already stored
-- stay; only adding more past the limit is refused.
create or replace function private.cloud_tile_limit(p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select case s.plan
      when 'starter' then 50
      when 'pro' then 100
      when 'advanced' then 200
    end
    from public.subscriptions s
    where s.user_id = p_user_id
      and s.plan is not null
      and s.status in ('active', 'trialing', 'past_due')
    order by s.event_at desc
    limit 1
  ), 5);
$$;

revoke all on function private.cloud_tile_limit(uuid) from public, anon, authenticated;
