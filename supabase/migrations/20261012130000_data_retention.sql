-- Keep personal data only as long as it's useful (the Privacy Policy's
-- "How long we keep it"): every night, delete notifications older than 180
-- days, and drop the page and browser details from feedback posts after 90
-- days, once a bug report has had time to be looked at.

create function private.prune_old_data()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.notifications
  where created_at < now() - interval '180 days';

  update public.feedback
  set page = null, user_agent = null
  where created_at < now() - interval '90 days'
    and (page is not null or user_agent is not null);
$$;

revoke execute on function private.prune_old_data() from public, anon, authenticated;

select cron.schedule('prune-old-data', '23 4 * * *', $$select private.prune_old_data();$$);
