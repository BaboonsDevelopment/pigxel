-- Assets page rework, step 1: blocks become packs, and assets get tags,
-- popularity, recent use and favourites.

-- Blocks are packs: a named set of assets made together, such as
-- "Dungeon Heroes". An asset's category is the pack it belongs to.
alter table public.asset_blocks rename to asset_packs;
alter table public.asset_packs rename constraint asset_blocks_pkey to asset_packs_pkey;
alter table public.asset_packs rename constraint asset_blocks_id_check to asset_packs_id_check;
alter table public.asset_packs rename constraint asset_blocks_name_check to asset_packs_name_check;
alter table public.asset_packs rename constraint asset_blocks_background_check to asset_packs_background_check;
alter policy "Asset blocks are visible to everyone signed in" on public.asset_packs
  rename to "Asset packs are visible to everyone signed in";
alter policy "Admins add asset blocks" on public.asset_packs rename to "Admins add asset packs";
alter policy "Admins change asset blocks" on public.asset_packs rename to "Admins change asset packs";
alter policy "Admins remove asset blocks" on public.asset_packs rename to "Admins remove asset packs";

alter table public.assets rename column category to pack_id;
alter table public.assets rename constraint assets_category_fkey to assets_pack_id_fkey;
alter index public.assets_category_sort_idx rename to assets_pack_id_sort_idx;
comment on column public.assets.pack_id is 'The pack it belongs to: an asset_packs id.';

-- A pack's description, and whether it's for paid plans. Premium is set per
-- pack; assets.premium still says where each asset's .pigxel file lives
-- (the private premium-assets bucket), which the app keeps in step when a
-- pack changes.
alter table public.asset_packs
  add column description text check (char_length(description) <= 400),
  add column premium boolean not null default false;

-- The first blocks were fixed categories; three never got assets.
delete from public.asset_packs p
where p.id in ('items', 'nature', 'tiles')
  and not exists (select 1 from public.assets a where a.pack_id = p.id);

-- Sizes are shown as a badge, not in the name ("Undead Legion · 64×64").
update public.asset_packs
set name = btrim(regexp_replace(name, '\s*·\s*\d+\s*(×\s*\d+|px)\s*$', ''))
where name ~ '·\s*\d+\s*(×\s*\d+|px)\s*$';

-- Tags: a fixed list the team manages, put on assets. A pack shows the tags
-- of its assets.
create table public.asset_tags (
  id text primary key
    check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(id) <= 40),
  name text not null check (char_length(btrim(name)) between 1 and 40),
  -- Lower comes first in the filters.
  sort integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.asset_tag_links (
  asset_id text not null references public.assets (id)
    on delete cascade on update cascade,
  tag_id text not null references public.asset_tags (id)
    on delete cascade on update cascade,
  primary key (asset_id, tag_id)
);

create index asset_tag_links_tag_idx on public.asset_tag_links (tag_id);

alter table public.asset_tags enable row level security;
alter table public.asset_tag_links enable row level security;

create policy "Asset tags are visible to everyone signed in"
  on public.asset_tags for select to authenticated using (true);
create policy "Admins manage asset tags"
  on public.asset_tags for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

create policy "Asset tag links are visible to everyone signed in"
  on public.asset_tag_links for select to authenticated using (true);
create policy "Admins manage asset tag links"
  on public.asset_tag_links for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

revoke all on public.asset_tags, public.asset_tag_links from anon, authenticated;
grant select, insert, update, delete
  on public.asset_tags, public.asset_tag_links to authenticated;

-- Uses: starting a tile from an asset, downloading or copying it. One row per
-- person, asset and kind; using it again only moves used_at, which orders
-- "Recently used". assets.uses counts the people who used it, for "Popular",
-- so one person can't inflate it.
create table public.asset_uses (
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  asset_id text not null references public.assets (id)
    on delete cascade on update cascade,
  kind text not null check (kind in ('start', 'download', 'copy')),
  used_at timestamptz not null default now(),
  primary key (user_id, asset_id, kind)
);

create index asset_uses_recent_idx on public.asset_uses (user_id, used_at desc);
create index asset_uses_asset_idx on public.asset_uses (asset_id);

alter table public.assets add column uses integer not null default 0;
comment on column public.assets.uses is
  'How many people started a tile from it, downloaded or copied it.';
create index assets_uses_idx on public.assets (uses desc, name);

create function private.count_asset_use()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- A person counts once per asset, whatever kinds of use they have: the
  -- count moves only with their first use and when their last one goes.
  if tg_op = 'INSERT' then
    if not exists (
      select 1 from public.asset_uses
      where asset_id = new.asset_id and user_id = new.user_id
        and kind <> new.kind
    ) then
      update public.assets set uses = uses + 1 where id = new.asset_id;
    end if;
  elsif not exists (
    select 1 from public.asset_uses
    where asset_id = old.asset_id and user_id = old.user_id
  ) then
    update public.assets set uses = greatest(uses - 1, 0)
    where id = old.asset_id;
  end if;
  return null;
end;
$$;

revoke all on function private.count_asset_use() from public, anon, authenticated;

create trigger asset_uses_count
  after insert or delete on public.asset_uses
  for each row execute function private.count_asset_use();

alter table public.asset_uses enable row level security;

create policy "People see their own asset uses"
  on public.asset_uses for select to authenticated
  using (user_id = (select auth.uid()));

-- Uses are only written through record_asset_use, so a row can't be moved
-- to another asset or kind.
revoke all on public.asset_uses from anon, authenticated;
grant select on public.asset_uses to authenticated;

create function public.record_asset_use(p_asset text, p_kind text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in to use assets.' using errcode = '42501';
  end if;
  insert into public.asset_uses (user_id, asset_id, kind)
  values ((select auth.uid()), p_asset, p_kind)
  on conflict (user_id, asset_id, kind) do update set used_at = now();
end;
$$;

revoke all on function public.record_asset_use(text, text) from public, anon;
grant execute on function public.record_asset_use(text, text) to authenticated;

-- Favourite assets and packs, each person's own.
create table public.asset_favourites (
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  asset_id text not null references public.assets (id)
    on delete cascade on update cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, asset_id)
);

create table public.asset_pack_favourites (
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  pack_id text not null references public.asset_packs (id)
    on delete cascade on update cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, pack_id)
);

alter table public.asset_favourites enable row level security;
alter table public.asset_pack_favourites enable row level security;

create policy "People see their favourite assets"
  on public.asset_favourites for select to authenticated
  using (user_id = (select auth.uid()));
create policy "People add favourite assets"
  on public.asset_favourites for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "People remove favourite assets"
  on public.asset_favourites for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "People see their favourite asset packs"
  on public.asset_pack_favourites for select to authenticated
  using (user_id = (select auth.uid()));
create policy "People add favourite asset packs"
  on public.asset_pack_favourites for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "People remove favourite asset packs"
  on public.asset_pack_favourites for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.asset_favourites, public.asset_pack_favourites
  from anon, authenticated;
grant select, insert, delete
  on public.asset_favourites, public.asset_pack_favourites to authenticated;
