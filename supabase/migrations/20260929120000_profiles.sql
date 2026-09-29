-- Artist profiles: one per account, created at sign-up. Public profiles and
-- their public tiles can be seen by every signed-in person; private ones only
-- by their owner.

-- Helpers the API doesn't expose. Checks on `profiles` call some of them as
-- the signed-in person, so that role may use the schema; functions that
-- write are closed to it below.
create schema if not exists private;
grant usage on schema private to authenticated, supabase_auth_admin;

-- Names nobody can take, so they can't pass for Pigxel itself.
create function private.reserved_username(name text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select name in (
    'admin', 'administrator', 'api', 'help', 'me', 'mod', 'moderator',
    'official', 'pigxel', 'profile', 'root', 'settings', 'staff', 'support',
    'system', 'team'
  );
$$;

-- Up to three links, each {"label": "...", "url": "https://..."}.
create function private.valid_links(links jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(links) = 'array'
    and jsonb_array_length(links) <= 3
    and not exists (
      select 1
      from jsonb_array_elements(links) as link
      where jsonb_typeof(link) <> 'object'
        or jsonb_typeof(link -> 'url') <> 'string'
        or (link ->> 'url') !~ '^https://[^\s/]+\.[^\s]+$'
        or char_length(link ->> 'url') > 200
        or (link ? 'label' and (
          jsonb_typeof(link -> 'label') <> 'string'
          or char_length(link ->> 'label') > 40
        ))
    );
$$;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique
    check (username ~ '^[a-z0-9_]{3,20}$' and not private.reserved_username(username)),
  display_name text not null
    check (char_length(btrim(display_name)) between 1 and 50),
  bio text not null default '' check (char_length(bio) <= 200),
  links jsonb not null default '[]'::jsonb check (private.valid_links(links)),
  -- Which picture to show: none (the initial), the sign-in provider's, or an upload.
  avatar_kind text not null default 'provider'
    check (avatar_kind in ('none', 'provider', 'upload')),
  -- Kept in sync with the sign-in provider (e.g. the Google photo); not editable.
  provider_avatar_url text check (provider_avatar_url ~ '^https://'),
  -- An upload in the `avatars` bucket, always inside the owner's own folder.
  avatar_path text check (avatar_path like (id::text || '/%')),
  visibility text not null default 'public'
    check (visibility in ('public', 'private')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (avatar_kind <> 'upload' or avatar_path is not null)
);

alter table public.profiles enable row level security;

create policy "Public profiles, and your own, are visible"
  on public.profiles for select to authenticated
  using (visibility = 'public' or (select auth.uid()) = id);

create policy "People update their own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Rows come from sign-up and go with the account; people only edit these
-- columns. Supabase grants everything on new tables by default, so start over.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (username, display_name, bio, links, avatar_kind, avatar_path, visibility)
  on public.profiles to authenticated;

create function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function private.touch_updated_at();

-- The https picture from the sign-in provider's details, if any.
create function private.provider_avatar(meta jsonb)
returns text
language sql
immutable
set search_path = ''
as $$
  select url from (
    select coalesce(
      nullif(btrim(meta ->> 'avatar_url'), ''),
      nullif(btrim(meta ->> 'picture'), '')
    ) as url
  ) as picked
  where url ~ '^https://';
$$;

-- A free username based on the person's name or email, e.g. "ada_lovelace" or "ada_4821".
create function private.pick_username(email text, meta jsonb)
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  base text;
  candidate text;
begin
  base := lower(coalesce(
    nullif(meta ->> 'user_name', ''),
    nullif(meta ->> 'preferred_username', ''),
    split_part(coalesce(email, ''), '@', 1)
  ));
  base := regexp_replace(base, '[^a-z0-9_]+', '_', 'g');
  base := left(btrim(base, '_'), 15);
  if char_length(base) < 3 then
    base := 'artist';
  end if;
  candidate := base;
  while private.reserved_username(candidate)
    or exists (select 1 from public.profiles where username = candidate)
  loop
    candidate := base || '_' || lpad((floor(random() * 10000))::int::text, 4, '0');
  end loop;
  return candidate;
end;
$$;

create function private.create_profile(
  user_id uuid,
  email text,
  meta jsonb
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username, display_name, provider_avatar_url)
  values (
    user_id,
    private.pick_username(email, meta),
    left(coalesce(
      nullif(btrim(meta ->> 'full_name'), ''),
      nullif(btrim(meta ->> 'name'), ''),
      nullif(split_part(coalesce(email, ''), '@', 1), ''),
      'Pigxel artist'
    ), 50),
    private.provider_avatar(meta)
  )
  on conflict (id) do nothing;
end;
$$;

create function private.on_user_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.create_profile(new.id, new.email, new.raw_user_meta_data);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.on_user_created();

-- Signing in with Google again (or linking it) refreshes the provider picture.
create function private.on_user_meta_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set provider_avatar_url = private.provider_avatar(new.raw_user_meta_data)
  where id = new.id
    and provider_avatar_url is distinct from private.provider_avatar(new.raw_user_meta_data);
  return new;
end;
$$;

create trigger on_auth_user_meta_changed
  after update of raw_user_meta_data on auth.users
  for each row execute function private.on_user_meta_changed();

revoke all on function
  private.pick_username(text, jsonb),
  private.create_profile(uuid, text, jsonb),
  private.on_user_created(),
  private.on_user_meta_changed()
  from public, anon, authenticated;
-- Supabase Auth writes auth.users, which fires the triggers.
grant execute on function
  private.on_user_created(),
  private.on_user_meta_changed()
  to supabase_auth_admin;

-- Accounts made before profiles existed.
select private.create_profile(id, email, raw_user_meta_data) from auth.users;

-- Tells "private" apart from "no such person", which RLS alone hides.
create function public.profile_is_private(name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where username = lower(name) and visibility = 'private'
  );
$$;

-- Whether the signed-in person could take `name`, private profiles included.
create function public.username_available(name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1 from public.profiles
    where username = lower(name) and id <> (select auth.uid())
  );
$$;

revoke all on function
  public.profile_is_private(text),
  public.username_available(text)
  from public, anon;
grant execute on function
  public.profile_is_private(text),
  public.username_available(text)
  to authenticated;

-- Profile pictures: readable by link (profiles show them), at most 1 MB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 1048576, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy "People upload their own avatar"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "People see their own avatar files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "People delete their own avatar files"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Tiles become private drafts or published arts, and up to six can be pinned.
alter table public.tiles
  add column visibility text not null default 'private'
    check (visibility in ('private', 'public')),
  add column published_at timestamptz,
  add column pin_order smallint check (pin_order between 1 and 6);

create unique index tiles_user_id_pin_order_idx
  on public.tiles (user_id, pin_order) where pin_order is not null;
create index tiles_public_published_at_idx
  on public.tiles (published_at desc) where visibility = 'public';

-- The first time a tile goes public is when it was published.
create function private.stamp_published_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.visibility = 'public' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end;
$$;

create trigger tiles_stamp_published_at
  before insert or update of visibility on public.tiles
  for each row execute function private.stamp_published_at();

create policy "Public tiles of public profiles are visible"
  on public.tiles for select to authenticated
  using (
    visibility = 'public'
    and exists (
      select 1 from public.profiles
      where profiles.id = tiles.user_id and profiles.visibility = 'public'
    )
  );
