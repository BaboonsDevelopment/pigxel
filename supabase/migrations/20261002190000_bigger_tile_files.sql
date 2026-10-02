-- Tiles imported from pictures, or with many frames and layers, outgrow 1 MB
-- (a single 256×256 frame of a photo-like picture is ~350 KB). 50 MB is the
-- most a Supabase project accepts per file by default.
update storage.buckets
set file_size_limit = 52428800
where id = 'tiles';
