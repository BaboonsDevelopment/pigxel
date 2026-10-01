-- Ties each tile to its author's profile, so a list of tiles can bring the
-- author along in the same request. Every user has a profile, made on sign-up.
alter table public.tiles
  add constraint tiles_user_id_profiles_fkey
  foreign key (user_id) references public.profiles (id) on delete cascade;
