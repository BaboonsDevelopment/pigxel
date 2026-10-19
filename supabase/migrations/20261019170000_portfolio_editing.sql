-- Stable, owner-controlled portfolio ordering and editing.
alter table public.hiring_portfolio_items add column sort_order integer not null default 0;
with ranked as (
  select id, row_number() over (partition by user_id order by created_at desc, id)::integer as position
  from public.hiring_portfolio_items
)
update public.hiring_portfolio_items p set sort_order = r.position from ranked r where p.id = r.id;
create index portfolio_order on public.hiring_portfolio_items (user_id, sort_order);

create policy "Paid owners edit portfolio items" on public.hiring_portfolio_items for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and private.has_paid_plan((select auth.uid())));
grant update (title, description, url, tile_id) on public.hiring_portfolio_items to authenticated;

create or replace function private.guard_portfolio_item()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform pg_advisory_xact_lock(hashtextextended(new.user_id::text || ':portfolio', 0));
    if (select count(*) from public.hiring_portfolio_items where user_id = new.user_id) >= 12 then
      raise exception 'Your portfolio can contain up to twelve items';
    end if;
    select coalesce(max(sort_order), 0) + 1 into new.sort_order
      from public.hiring_portfolio_items where user_id = new.user_id;
  end if;
  -- Previously selected artwork may since have become private. Validate it only
  -- when a new preview is selected, so text edits and ordering remain possible.
  if tg_op = 'INSERT' or new.tile_id is distinct from old.tile_id then
    if new.tile_id is not null and not exists (select 1 from public.tiles where id = new.tile_id
      and user_id = new.user_id and visibility = 'public' and review = 'approved' and deleted_at is null) then
      raise exception 'Choose one of your published artworks';
    end if;
  end if;
  return new;
end;
$$;
drop trigger portfolio_guard on public.hiring_portfolio_items;
create trigger portfolio_guard before insert or update on public.hiring_portfolio_items
  for each row execute function private.guard_portfolio_item();

create function public.reorder_portfolio_items(p_ids uuid[])
returns void language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  item_count integer;
begin
  if actor is null or not private.has_paid_plan(actor) then
    raise exception 'A paid plan is needed to reorder portfolio work';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(actor::text || ':portfolio', 0));
  -- Lock the complete set against deletion/editing while checking and reordering.
  perform 1 from public.hiring_portfolio_items where user_id = actor for update;
  select count(*) into item_count from public.hiring_portfolio_items where user_id = actor;
  if p_ids is null or cardinality(p_ids) <> item_count or item_count > 12
    or (select count(distinct id) from unnest(p_ids) as ids(id)) <> item_count
    or exists (select 1 from unnest(p_ids) as ids(id) where not exists (
      select 1 from public.hiring_portfolio_items where id = ids.id and user_id = actor
    )) then
    raise exception 'Portfolio changed. Refresh and try again';
  end if;
  update public.hiring_portfolio_items p set sort_order = ordered.position::integer
    from unnest(p_ids) with ordinality as ordered(id, position)
    where p.id = ordered.id and p.user_id = actor;
end;
$$;
revoke all on function public.reorder_portfolio_items(uuid[]) from public, anon;
grant execute on function public.reorder_portfolio_items(uuid[]) to authenticated;
