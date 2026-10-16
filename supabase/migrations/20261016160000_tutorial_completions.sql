-- Tutorials each person has finished in the editor's guide, so Home can
-- show what's left to learn and mark the rest done. One row per tutorial.
create table public.tutorial_completions (
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  slug text not null check (char_length(slug) between 1 and 100),
  completed_at timestamptz not null default now(),
  primary key (user_id, slug)
);

alter table public.tutorial_completions enable row level security;

create policy "People see the tutorials they finished"
  on public.tutorial_completions for select to authenticated
  using (user_id = (select auth.uid()));

create policy "People record the tutorials they finish"
  on public.tutorial_completions for insert to authenticated
  with check (user_id = (select auth.uid()));

revoke all on public.tutorial_completions from anon, authenticated;
grant select, insert on public.tutorial_completions to authenticated;
