alter table public.tiles add column deleted_at timestamptz;

create index tiles_deleted_at_idx
  on public.tiles (deleted_at)
  where deleted_at is not null;

select cron.schedule(
  'empty-project-trash',
  '17 3 * * *',
  $$
  select net.http_get(
    url := (
      select decrypted_secret from vault.decrypted_secrets
      where name = 'pigxel_app_url'
    ) || '/api/trash/purge',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets
        where name = 'pigxel_cron_secret'
      )
    ),
    timeout_milliseconds := 60000
  );
  $$
);
