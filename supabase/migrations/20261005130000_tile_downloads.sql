create table public.tile_downloads (
  tile_id uuid primary key references public.tiles (id) on delete cascade,
  total bigint not null default 0 check (total >= 0)
);

alter table public.tile_downloads enable row level security;

create policy "Download counts of visible tiles are visible"
  on public.tile_downloads for select to anon, authenticated
  using (exists (select 1 from public.tiles where tiles.id = tile_id));

revoke all on public.tile_downloads from anon, authenticated;
grant select on public.tile_downloads to anon, authenticated;

create function public.record_tile_download(tile uuid)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  counted bigint;
begin
  if not exists (
    select 1 from public.tiles
    where tiles.id = tile and tiles.visibility = 'public'
  ) then
    raise exception 'Art not found' using errcode = 'P0002';
  end if;
  insert into public.tile_downloads as d (tile_id, total)
  values (tile, 1)
  on conflict (tile_id) do update set total = d.total + 1
  returning d.total into counted;
  return counted;
end;
$$;

revoke all on function public.record_tile_download(uuid) from public;
grant execute on function public.record_tile_download(uuid) to anon, authenticated;
