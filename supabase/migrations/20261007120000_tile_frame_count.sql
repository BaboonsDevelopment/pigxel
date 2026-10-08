alter table public.tiles
  add column frame_count integer not null default 1 check (frame_count >= 1);
