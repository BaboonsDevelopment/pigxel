-- No OAuth tokens are persisted. The bot manages the one configured role.
-- Account deletion leaves a role-removal job; the sync worker deletes it.
create table public.discord_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references public.profiles(id) on delete set null,
  discord_user_id text not null unique check (discord_user_id ~ '^[0-9]{17,20}$'),
  username text not null,
  disconnect_requested boolean not null default false,
  synced_premium boolean not null default false,
  sync_version bigint not null default 0,
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);
alter table public.discord_connections enable row level security;
create policy "People see their own Discord connection" on public.discord_connections
  for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.discord_connections from anon, authenticated;
grant select on public.discord_connections to authenticated;

-- Pending changes sort before periodic reconciliation. Version checks keep a
-- slow API response from clearing a newer subscription/disconnect change.
create function private.queue_discord_connection_change()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.user_id is distinct from old.user_id or new.disconnect_requested is distinct from old.disconnect_requested then
    new.last_synced_at := null;
    new.sync_version := old.sync_version + 1;
  end if;
  return new;
end;
$$;
create trigger discord_connection_changed before update on public.discord_connections
  for each row execute function private.queue_discord_connection_change();

create function private.queue_discord_subscription_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.discord_connections set last_synced_at = null, sync_version = sync_version + 1
    where user_id = coalesce(new.user_id, old.user_id);
  return null;
end;
$$;
create trigger subscription_discord_sync after insert or update or delete on public.subscriptions
  for each row execute function private.queue_discord_subscription_change();

select cron.schedule('sync-discord-roles', '*/15 * * * *', $$
  select net.http_get(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'pigxel_app_url') || '/api/discord/sync',
    headers := jsonb_build_object('Authorization', 'Bearer ' ||
      (select decrypted_secret from vault.decrypted_secrets where name = 'pigxel_cron_secret')),
    timeout_milliseconds := 60000
  );
$$);
