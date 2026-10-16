-- Blocks on the Assets page: named sections of assets, such as "Forest".
-- An asset's category is now the id of its block, and its kind says whether
-- it's a sprite or a seamless tile. The four fixed categories become the
-- first four blocks, so assets already published keep their sections.

create table public.asset_blocks (
  id text primary key
    check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(id) <= 40),
  name text not null check (char_length(btrim(name)) between 1 and 40),
  -- Lower comes first on the Assets page.
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.asset_blocks (id, name, sort) values
  ('characters', 'Characters', 0),
  ('items', 'Items', 1),
  ('nature', 'Nature', 2),
  ('tiles', 'Tiles', 3);

alter table public.asset_blocks enable row level security;

create policy "Asset blocks are visible to everyone signed in"
  on public.asset_blocks for select to authenticated
  using (true);

create policy "Admins add asset blocks"
  on public.asset_blocks for insert to authenticated
  with check (private.is_admin());

create policy "Admins change asset blocks"
  on public.asset_blocks for update to authenticated
  using (private.is_admin())
  with check (private.is_admin());

create policy "Admins remove asset blocks"
  on public.asset_blocks for delete to authenticated
  using (private.is_admin());

revoke all on public.asset_blocks from anon, authenticated;
grant select, insert, update, delete on public.asset_blocks to authenticated;

alter table public.assets drop constraint assets_category_check;

alter table public.assets
  add constraint assets_category_fkey
  foreign key (category) references public.asset_blocks (id)
  on update cascade;

alter table public.assets
  add column kind text not null default 'sprite'
  check (kind in ('sprite', 'tile'));

update public.assets set kind = 'tile' where category = 'tiles';

comment on column public.assets.category is
  'The block it shows in on the Assets page: an asset_blocks id.';
