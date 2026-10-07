-- Calls /api/paddle/downgrades every hour so downgrades switch in Paddle just
-- before renewal (see 20261004120000_subscription_plan_changes.sql).
--
-- The app's URL and CRON_SECRET live in Vault, not here. Create them once per
-- project (SQL editor), with the same secret as the app's CRON_SECRET:
--
--   select vault.create_secret('https://your-app.example', 'pigxel_app_url');
--   select vault.create_secret('<CRON_SECRET>', 'pigxel_cron_secret');
--
-- Until both exist, each run fails without doing anything. Responses are kept
-- for a few hours in net._http_response; a 500 means a downgrade failed.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'apply-paddle-downgrades',
  '7 * * * *',
  $$
  select net.http_get(
    url := (
      select decrypted_secret from vault.decrypted_secrets
      where name = 'pigxel_app_url'
    ) || '/api/paddle/downgrades',
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
