-- Counting likes in the same request as the tiles needs the whole table:
-- PostgREST's embedded count is refused with only some columns granted.
-- Rows stay limited to likes of tiles a guest may see.
grant select on public.tile_likes to anon;
