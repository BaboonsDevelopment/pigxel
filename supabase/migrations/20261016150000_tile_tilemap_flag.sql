-- Whether a tile has a tilemap layer, so cards can mark tilesets without
-- opening the file. The app sets it on every save; tiles saved before this
-- show it from their next save.
alter table public.tiles add column tilemap boolean not null default false;
