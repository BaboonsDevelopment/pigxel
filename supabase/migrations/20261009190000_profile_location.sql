alter table public.profiles
  add column location text not null default ''
    check (char_length(location) <= 60);

grant update (location) on public.profiles to authenticated;
