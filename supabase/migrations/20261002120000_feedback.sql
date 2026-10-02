-- The feedback board: bug reports and feature requests everyone can see and
-- vote for, like issues on GitHub. Only the team (with the service role, e.g.
-- in the dashboard) moves one on from "open"; until then each person can
-- have at most three open bugs and three open feature requests.
create table public.feedback (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('bug', 'feature')),
  title text not null check (char_length(title) between 1 and 100),
  description text not null check (char_length(description) between 1 and 300),
  status text not null default 'open' check (
    status in ('open', 'approved', 'in_development', 'implemented', 'declined', 'closed')
  ),
  -- Kept up to date from feedback_votes, to sort by.
  votes integer not null default 0 check (votes >= 0),
  -- What helps the team look into it, never shown to others: the page it
  -- was sent from, the browser and the Pigxel version.
  page text check (char_length(page) <= 300),
  user_agent text check (char_length(user_agent) <= 500),
  app_version text check (char_length(app_version) <= 20),
  created_at timestamptz not null default now()
);

create index feedback_kind_votes_idx on public.feedback (kind, votes desc, id desc);
create index feedback_user_id_kind_status_idx
  on public.feedback (user_id, kind, status);

-- At most three open reports of each kind per person. A lock per person and
-- kind keeps two quick sends from both slipping under the limit.
create function private.limit_open_feedback()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text || new.kind, 0));
  if (
    select count(*) from public.feedback
    where user_id = new.user_id and kind = new.kind and status = 'open'
  ) >= 3 then
    raise exception 'feedback_open_limit'
      using hint = 'Three open reports of a kind is the most one person can have.';
  end if;
  return new;
end;
$$;

create trigger feedback_limit_open
  before insert on public.feedback
  for each row execute function private.limit_open_feedback();

alter table public.feedback enable row level security;

create policy "Feedback is visible to everyone signed in"
  on public.feedback for select to authenticated
  using (true);

create policy "People send their own feedback"
  on public.feedback for insert to authenticated
  with check ((select auth.uid()) = user_id);

revoke all on public.feedback from anon, authenticated;
grant select (id, user_id, kind, title, description, status, votes, created_at)
  on public.feedback to authenticated;
grant insert (kind, title, description, page, user_agent, app_version)
  on public.feedback to authenticated;

-- Votes: one per person and report, while it's still being worked out.
create table public.feedback_votes (
  feedback_id bigint not null references public.feedback (id) on delete cascade,
  user_id uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (feedback_id, user_id)
);

create index feedback_votes_user_id_idx on public.feedback_votes (user_id);

alter table public.feedback_votes enable row level security;

create policy "People see their own votes"
  on public.feedback_votes for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "People vote for open feedback"
  on public.feedback_votes for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.feedback
      where feedback.id = feedback_id
        and feedback.status in ('open', 'approved', 'in_development')
    )
  );

create policy "People take back their votes"
  on public.feedback_votes for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.feedback_votes from anon, authenticated;
grant select, delete on public.feedback_votes to authenticated;
grant insert (feedback_id) on public.feedback_votes to authenticated;

-- Keeps feedback.votes counting the votes.
create function private.count_feedback_votes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.feedback set votes = votes + 1 where id = new.feedback_id;
  else
    update public.feedback set votes = greatest(votes - 1, 0)
    where id = old.feedback_id;
  end if;
  return null;
end;
$$;

create trigger feedback_votes_count
  after insert or delete on public.feedback_votes
  for each row execute function private.count_feedback_votes();
