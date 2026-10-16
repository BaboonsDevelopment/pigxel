-- There's no separate page to accept the terms any more: signing up or
-- logging in (email, Google or Apple) records the acceptance, as each page
-- says. 'gate' stays allowed for rows recorded by that page before.
alter table public.legal_acceptances
  drop constraint legal_acceptances_source_check;
alter table public.legal_acceptances
  add constraint legal_acceptances_source_check
  check (source in ('signup', 'oauth', 'login', 'gate'));
