insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tile-versions', 'tile-versions', false, 1048576, array['application/vnd.pigxel+json'])
on conflict (id) do nothing;

create table public.tile_versions (
  id uuid primary key default gen_random_uuid(),
  tile_id uuid not null references public.tiles (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  width integer not null,
  height integer not null,
  frame_count integer not null default 1,
  thumbnail text,
  created_at timestamptz not null default now()
);

create index tile_versions_tile_id_created_at_idx
  on public.tile_versions (tile_id, created_at desc);

alter table public.tile_versions enable row level security;

create policy "Owners and members see versions"
  on public.tile_versions for select to authenticated
  using (private.owns_tile(tile_id) or private.member_role(tile_id) is not null);

revoke all on public.tile_versions from anon, authenticated;
grant select on public.tile_versions to authenticated;
