alter table public.tiles
  add column remix_of_tile uuid references public.tiles (id) on delete set null,
  add column remix_of_user uuid references public.profiles (id) on delete set null;

create index tiles_remix_of_tile_idx on public.tiles (remix_of_tile);
