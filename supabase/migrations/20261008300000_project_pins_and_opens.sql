alter table public.tiles
  add column pinned_at timestamptz,
  add column opened_at timestamptz;

create index tiles_user_id_opened_at_idx
  on public.tiles (user_id, opened_at desc)
  where opened_at is not null;
