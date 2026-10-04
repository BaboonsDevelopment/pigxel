-- Keeps profiles.premium_since in step with billing: set when the person's
-- paid membership starts, kept through plan changes and failed-payment
-- retries, and cleared once no paid subscription is left.
create function private.sync_premium_since()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  paid_since timestamptz;
begin
  select min(created_at) into paid_since
  from public.subscriptions
  where user_id = new.user_id
    and status in ('active', 'trialing', 'past_due');

  update public.profiles
  set premium_since = case
    when paid_since is null then null
    else coalesce(premium_since, paid_since)
  end
  where id = new.user_id
    and premium_since is distinct from case
      when paid_since is null then null
      else coalesce(premium_since, paid_since)
    end;
  return null;
end;
$$;

create trigger subscriptions_sync_premium_since
  after insert or update of status on public.subscriptions
  for each row execute function private.sync_premium_since();

revoke all on function private.sync_premium_since() from public, anon, authenticated;
-- The Paddle webhook writes subscriptions with the secret key.
grant execute on function private.sync_premium_since() to service_role;

-- Subscribers from before this migration.
update public.profiles p
set premium_since = paid.since
from (
  select user_id, min(created_at) as since
  from public.subscriptions
  where status in ('active', 'trialing', 'past_due')
  group by user_id
) paid
where p.id = paid.user_id
  and p.premium_since is null;
