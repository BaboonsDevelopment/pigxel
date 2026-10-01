-- Paddle subscriptions. The Paddle webhook writes them with the secret key;
-- people can only read their own.
create table public.subscriptions (
  -- Paddle's subscription ID (sub_…).
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  customer_id text not null,
  status text not null
    check (status in ('active', 'trialing', 'past_due', 'paused', 'canceled')),
  price_id text not null,
  current_period_ends_at timestamptz,
  -- Set when a cancellation is scheduled for the end of the period.
  cancels_at timestamptz,
  -- When the last applied Paddle event happened; older events are ignored,
  -- since Paddle doesn't guarantee the order it delivers them in.
  event_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.subscriptions is
  'Paddle subscriptions, written by the Paddle webhook. Readable by their owner.';

create index subscriptions_user_id_idx on public.subscriptions (user_id);

alter table public.subscriptions enable row level security;
revoke all on public.subscriptions from anon, authenticated;
grant select on public.subscriptions to authenticated;

create policy "People read their own subscriptions"
  on public.subscriptions for select to authenticated
  using ((select auth.uid()) = user_id);

-- Applies one Paddle event in a single statement, skipping it when a newer
-- event for the same subscription is already stored.
create function public.apply_paddle_subscription(
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
    updated_at = now()
  where s.event_at <= excluded.event_at;
$$;

revoke all on function public.apply_paddle_subscription from public, anon, authenticated;
grant execute on function public.apply_paddle_subscription to service_role;
