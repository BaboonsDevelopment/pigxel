create table public.tile_download_people (
  tile_id uuid not null references public.tiles (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (tile_id, user_id)
);

alter table public.tile_download_people enable row level security;

revoke all on public.tile_download_people from anon, authenticated;

create or replace function public.record_tile_download(tile uuid)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  person uuid := auth.uid();
  counted bigint;
begin
  if not exists (
    select 1 from public.tiles
    where tiles.id = tile and tiles.visibility = 'public'
  ) then
    raise exception 'Art not found' using errcode = 'P0002';
  end if;
  if person is not null then
    insert into public.tile_download_people (tile_id, user_id)
    values (tile, person)
    on conflict do nothing;
    if found then
      insert into public.tile_downloads as d (tile_id, total)
      values (tile, 1)
      on conflict (tile_id) do update set total = d.total + 1;
    end if;
  end if;
  select total into counted from public.tile_downloads where tile_id = tile;
  return coalesce(counted, 0);
end;
$$;
