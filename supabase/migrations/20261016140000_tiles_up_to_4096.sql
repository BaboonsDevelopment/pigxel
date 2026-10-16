-- Tiles can be up to 4096 × 4096 px (MAX_PIGXEL_SIZE in
-- apps/web/src/lib/pigxel-file/format.ts); keep the two in step.
alter table public.tiles drop constraint tiles_width_check;
alter table public.tiles drop constraint tiles_height_check;
alter table public.tiles
  add constraint tiles_width_check check (width between 1 and 4096),
  add constraint tiles_height_check check (height between 1 and 4096);

-- Big, detailed canvases outgrow 1 MB files; allow 10 MB per tile file and
-- per saved version.
update storage.buckets
set file_size_limit = 10485760
where id in ('tiles', 'tile-versions');
