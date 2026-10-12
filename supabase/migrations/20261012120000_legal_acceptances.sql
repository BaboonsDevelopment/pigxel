-- A record of each time someone accepted the Terms of Service and Privacy
-- Policy and confirmed they are old enough, so we can show who agreed to
-- which version and when. Versions are the documents' "last updated" dates
-- (LEGAL.updated in the app); when they change, people are asked again.
-- Rows are only ever added by the person themselves, and go with the account.

create table public.legal_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  terms_version text not null check (char_length(terms_version) <= 20),
  privacy_version text not null check (char_length(privacy_version) <= 20),
  -- They confirmed they meet the minimum age that applied at the time.
  min_age integer not null check (min_age between 13 and 21),
  -- Where they agreed: the sign-up form, or the page that asks again.
  source text not null check (source in ('signup', 'oauth', 'gate')),
  accepted_at timestamptz not null default now()
);

create index legal_acceptances_user_idx
  on public.legal_acceptances (user_id, accepted_at desc);

alter table public.legal_acceptances enable row level security;

create policy "People see their own acceptances"
  on public.legal_acceptances for select to authenticated
  using (user_id = (select auth.uid()));

create policy "People record their own acceptances"
  on public.legal_acceptances for insert to authenticated
  with check (user_id = (select auth.uid()));

revoke all on public.legal_acceptances from anon, authenticated;
grant select, insert on public.legal_acceptances to authenticated;
