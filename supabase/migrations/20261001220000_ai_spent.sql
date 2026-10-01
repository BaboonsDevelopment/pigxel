-- What the signed-in person's AI requests have cost in all, in US dollars:
-- their balance is a fixed allowance minus this (see lib/ai/credits.ts).
create function public.ai_spent_usd()
returns numeric
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(sum(cost_usd), 0)
  from public.ai_usage
  where user_id = (select auth.uid());
$$;

revoke execute on function public.ai_spent_usd() from public, anon;
grant execute on function public.ai_spent_usd() to authenticated;
