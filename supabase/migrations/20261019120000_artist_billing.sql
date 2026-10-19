-- Artist includes premium perks and 75 cloud arts, with no AI allowance.
alter table public.subscriptions drop constraint subscriptions_plan_check;
alter table public.subscriptions add constraint subscriptions_plan_check
  check (plan in ('artist', 'starter', 'pro', 'advanced'));

create or replace function private.cloud_tile_limit(p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select case s.plan
      when 'artist' then 75
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
