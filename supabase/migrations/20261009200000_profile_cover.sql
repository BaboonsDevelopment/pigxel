alter table public.profiles
  add column cover_path text check (cover_path like (id::text || '/%'));

grant update (cover_path) on public.profiles to authenticated;
