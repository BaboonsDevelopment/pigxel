-- The Assets page: sprites and tiles the team makes for everyone to start a
-- tile from or drop into one. Each is a row here, and two files in the
-- public `assets` bucket: its .pigxel file, and a PNG sheet of its frames
-- side by side at 1×, which the pages show scaled up. The files are named
-- after their contents, so browsers and the CDN can keep them for good.
--
-- Only admins change assets: people whose app_metadata has
-- "role": "admin", which only the dashboard or the service role can set:
--   update auth.users
--   set raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'
--   where email = '…';

-- Whether the signed-in person is an admin, from their session.
create function private.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

revoke execute on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;

create table public.assets (
  -- Also the folder of its files, e.g. "slime/…".
  id text primary key
    check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(id) <= 40),
  name text not null check (char_length(btrim(name)) between 1 and 40),
  category text not null
    check (category in ('characters', 'items', 'nature', 'tiles')),
  width integer not null check (width between 1 and 256),
  height integer not null check (height between 1 and 256),
  frame_count integer not null default 1 check (frame_count between 1 and 64),
  -- How long each frame shows in the preview, in milliseconds.
  frame_ms integer not null default 100 check (frame_ms between 1 and 65535),
  -- Its colours, most used first, for the swatches.
  colors text[] not null default '{}' check (cardinality(colors) <= 32),
  file_path text not null check (file_path like id || '/%.pigxel'),
  sheet_path text not null check (sheet_path like id || '/%.png'),
  -- Lower comes first within its category.
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index assets_category_sort_idx on public.assets (category, sort, name);

alter table public.assets enable row level security;

create policy "Assets are visible to everyone signed in"
  on public.assets for select to authenticated
  using (true);

create policy "Admins add assets"
  on public.assets for insert to authenticated
  with check (private.is_admin());

create policy "Admins change assets"
  on public.assets for update to authenticated
  using (private.is_admin())
  with check (private.is_admin());

create policy "Admins remove assets"
  on public.assets for delete to authenticated
  using (private.is_admin());

revoke all on public.assets from anon, authenticated;
grant select, insert, update, delete on public.assets to authenticated;

-- The files: readable by link, as the pages show them; at most 1 MB each.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('assets', 'assets', true, 1048576, array['image/png', 'application/vnd.pigxel+json'])
on conflict (id) do nothing;

create policy "Admins see asset files"
  on storage.objects for select to authenticated
  using (bucket_id = 'assets' and private.is_admin());

create policy "Admins upload asset files"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'assets' and private.is_admin());

create policy "Admins replace asset files"
  on storage.objects for update to authenticated
  using (bucket_id = 'assets' and private.is_admin())
  with check (bucket_id = 'assets' and private.is_admin());

create policy "Admins delete asset files"
  on storage.objects for delete to authenticated
  using (bucket_id = 'assets' and private.is_admin());
