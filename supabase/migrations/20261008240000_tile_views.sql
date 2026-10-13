create table public.tile_views (
  tile_id uuid primary key references public.tiles (id) on delete cascade,
  total bigint not null default 0 check (total >= 0)
);

alter table public.tile_views enable row level security;

create policy "View counts of visible tiles are visible"
  on public.tile_views for select to anon, authenticated
  using (exists (select 1 from public.tiles where tiles.id = tile_id));

revoke all on public.tile_views from anon, authenticated;
grant select on public.tile_views to anon, authenticated;

create table public.tile_view_people (
  tile_id uuid not null references public.tiles (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null default current_date,
  primary key (tile_id, user_id, day)
);

alter table public.tile_view_people enable row level security;
revoke all on public.tile_view_people from anon, authenticated;

create function public.record_tile_view(tile uuid)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  person uuid := auth.uid();
  owner uuid;
  counted bigint;
begin
  select user_id into owner from public.tiles
  where tiles.id = tile and tiles.visibility = 'public';
  if owner is null then
    raise exception 'Art not found' using errcode = 'P0002';
  end if;
  if person is distinct from owner then
    if person is not null then
      insert into public.tile_view_people (tile_id, user_id)
      values (tile, person)
      on conflict do nothing;
    end if;
    if person is null or found then
      insert into public.tile_views as v (tile_id, total)
      values (tile, 1)
      on conflict (tile_id) do update set total = v.total + 1;
    end if;
  end if;
  select total into counted from public.tile_views where tile_id = tile;
  return coalesce(counted, 0);
end;
$$;

revoke execute on function public.record_tile_view(uuid) from public;
grant execute on function public.record_tile_view(uuid) to anon, authenticated;
