-- Downgrades wait for the end of the paid period: the owner's choice is kept
-- here, and /api/paddle/downgrades switches the Paddle subscription to it
-- shortly before renewal. Upgrades switch in Paddle right away instead.
alter table public.subscriptions add column pending_price_id text;

comment on column public.subscriptions.pending_price_id is
  'Price the owner switches to at renewal. Cleared once Paddle reports it, or when the subscription is canceled.';

-- Same as before, but clears pending_price_id once the subscription is on
-- that price or has ended.
create or replace function public.apply_paddle_subscription(
  p_id text,
  p_user_id uuid,
  p_customer_id text,
  p_status text,
  p_price_id text,
  p_current_period_ends_at timestamptz,
  p_cancels_at timestamptz,
  p_event_at timestamptz
) returns void
language sql
set search_path = ''
as $$
  insert into public.subscriptions as s (
    id, user_id, customer_id, status, price_id,
    current_period_ends_at, cancels_at, event_at
  ) values (
    p_id, p_user_id, p_customer_id, p_status, p_price_id,
    p_current_period_ends_at, p_cancels_at, p_event_at
  )
  on conflict (id) do update set
    user_id = excluded.user_id,
    customer_id = excluded.customer_id,
    status = excluded.status,
    price_id = excluded.price_id,
    current_period_ends_at = excluded.current_period_ends_at,
    cancels_at = excluded.cancels_at,
    event_at = excluded.event_at,
    pending_price_id = case
      when excluded.price_id = s.pending_price_id
        or excluded.status = 'canceled'
      then null
      else s.pending_price_id
    end,
    updated_at = now()
  where s.event_at <= excluded.event_at;
$$;

revoke all on function public.apply_paddle_subscription from public, anon, authenticated;
grant execute on function public.apply_paddle_subscription to service_role;
