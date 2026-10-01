-- What each AI request cost: one row per request to Gemini, priced when it
-- was made, so a person can see what each of their generations cost.
create table public.ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  -- Which request: route, generate, animate, reviewAnimation, …
  step text not null check (char_length(step) <= 40),
  model text not null check (char_length(model) <= 80),
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  thinking_tokens integer not null default 0,
  image_tokens integer not null default 0,
  -- In US dollars; null when the model had no known price.
  cost_usd numeric(12, 6),
  created_at timestamptz not null default now()
);

create index ai_usage_user_id_created_at_idx
  on public.ai_usage (user_id, created_at desc);

alter table public.ai_usage enable row level security;

create policy "People see their own AI usage"
  on public.ai_usage for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "People's requests record their AI usage"
  on public.ai_usage for insert to authenticated
  with check ((select auth.uid()) = user_id);

revoke all on public.ai_usage from anon, authenticated;
grant select on public.ai_usage to authenticated;
grant insert (step, model, input_tokens, output_tokens, thinking_tokens, image_tokens, cost_usd)
  on public.ai_usage to authenticated;
