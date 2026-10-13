-- Billing moves from Paddle to Creem. Subscriptions keep their shape; the
-- Creem webhook writes them now, and each row names its plan so the database
-- can enforce the plan's Pigxel cloud limit.

-- Paddle never went live, so its rows are sandbox test data.
delete from public.subscriptions where price_id like 'pri\_%';

update public.profiles p
set premium_since = null
where p.premium_since is not null
  and not exists (
    select 1 from public.subscriptions s
    where s.user_id = p.id
      and s.status in ('active', 'trialing', 'past_due')
  );

alter table public.subscriptions rename column price_id to product_id;
alter table public.subscriptions rename column pending_price_id to pending_product_id;

-- Creem's "unpaid" comes after failed payment retries; it isn't a paid plan.
alter table public.subscriptions drop constraint subscriptions_status_check;
alter table public.subscriptions add constraint subscriptions_status_check
  check (status in ('active', 'trialing', 'past_due', 'paused', 'canceled', 'unpaid'));

alter table public.subscriptions add column plan text
  check (plan in ('starter', 'pro', 'advanced'));

comment on table public.subscriptions is
  'Creem subscriptions, written by the Creem webhook. Readable by their owner.';
comment on column public.subscriptions.id is 'Creem''s subscription ID (sub_…).';
comment on column public.subscriptions.product_id is 'Creem product the subscription is on.';
comment on column public.subscriptions.plan is 'Pigxel plan of product_id; null for products the app doesn''t know.';
comment on column public.subscriptions.pending_product_id is
  'Product the owner switches to at renewal. Cleared once Creem reports it, or when the subscription is canceled.';

drop function public.apply_paddle_subscription(
  text, uuid, text, text, text, timestamptz, timestamptz, timestamptz
);

-- Applies one Creem event in a single statement, skipping it when a newer
-- event for the same subscription is already stored: Creem retries failed
-- deliveries, so events can arrive out of order.
create function public.apply_creem_subscription(
  p_id text,
  p_user_id uuid,
  p_customer_id text,
  p_status text,
  p_product_id text,
  p_plan text,
  p_current_period_ends_at timestamptz,
  p_cancels_at timestamptz,
  p_event_at timestamptz
) returns void
language sql
set search_path = ''
as $$
  insert into public.subscriptions as s (
    id, user_id, customer_id, status, product_id, plan,
    current_period_ends_at, cancels_at, event_at
  ) values (
    p_id, p_user_id, p_customer_id, p_status, p_product_id, p_plan,
    p_current_period_ends_at, p_cancels_at, p_event_at
  )
  on conflict (id) do update set
    user_id = excluded.user_id,
    customer_id = excluded.customer_id,
    status = excluded.status,
    product_id = excluded.product_id,
    plan = excluded.plan,
    current_period_ends_at = excluded.current_period_ends_at,
    cancels_at = excluded.cancels_at,
    event_at = excluded.event_at,
    pending_product_id = case
      when excluded.product_id = s.pending_product_id
        or excluded.status = 'canceled'
      then null
      else s.pending_product_id
    end,
    updated_at = now()
  where s.event_at <= excluded.event_at;
$$;

revoke all on function public.apply_creem_subscription from public, anon, authenticated;
grant execute on function public.apply_creem_subscription to service_role;

-- The hourly downgrade job moves to the provider-neutral route.
select cron.unschedule('apply-paddle-downgrades');

select cron.schedule(
  'apply-plan-downgrades',
  '7 * * * *',
  $$
  select net.http_get(
    url := (
      select decrypted_secret from vault.decrypted_secrets
      where name = 'pigxel_app_url'
    ) || '/api/billing/downgrades',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets
        where name = 'pigxel_cron_secret'
      )
    ),
    timeout_milliseconds := 30000
  );
  $$
);

-- How many arts a person may keep in Pigxel cloud. The numbers match
-- features/billing/pricing.ts; change both together.
create function private.cloud_tile_limit(p_user_id uuid)
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
  ), 10);
$$;

revoke all on function private.cloud_tile_limit(uuid) from public, anon, authenticated;

-- New cloud tiles stop at the plan's limit. Tiles already stored stay, even
-- after a downgrade; only adding more is refused.
create function private.enforce_cloud_tile_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  tile_limit integer;
begin
  -- One insert at a time per person, so two saves can't both slip under.
  perform pg_advisory_xact_lock(hashtext('cloud_tiles:' || new.user_id::text));
  tile_limit := private.cloud_tile_limit(new.user_id);
  if (select count(*) from public.tiles where user_id = new.user_id) >= tile_limit then
    raise exception 'cloud_tile_limit:%', tile_limit
      using errcode = 'P0001',
        hint = 'The plan''s Pigxel cloud limit is reached.';
  end if;
  return new;
end;
$$;

create trigger tiles_enforce_cloud_tile_limit
  before insert on public.tiles
  for each row execute function private.enforce_cloud_tile_limit();

revoke all on function private.enforce_cloud_tile_limit() from public, anon;
-- People save tiles from the browser with their own session.
grant execute on function private.enforce_cloud_tile_limit() to authenticated, service_role;

-- What the signed-in person's AI requests have cost since a moment, in US
-- dollars: paid plans count the current month (see features/ai/credits.ts).
create function public.ai_spent_usd_since(p_since timestamptz)
returns numeric
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(sum(cost_usd), 0)
  from public.ai_usage
  where user_id = (select auth.uid())
    and created_at >= p_since;
$$;

revoke execute on function public.ai_spent_usd_since(timestamptz) from public, anon;
grant execute on function public.ai_spent_usd_since(timestamptz) to authenticated;
