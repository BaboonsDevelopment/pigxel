create function public.reorder_pins(ids uuid[])
returns void
language plpgsql
set search_path = ''
as $$
begin
  update public.tiles set pin_order = null
  where user_id = (select auth.uid()) and id = any(ids);
  update public.tiles t set pin_order = o.n
  from unnest(ids) with ordinality as o(id, n)
  where t.id = o.id and t.user_id = (select auth.uid());
end;
$$;

revoke all on function public.reorder_pins(uuid[]) from public, anon;
grant execute on function public.reorder_pins(uuid[]) to authenticated;
