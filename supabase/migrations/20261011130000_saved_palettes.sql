create table public.saved_palettes (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 60),
  colors text[] not null check (
    cardinality(colors) between 1 and 256
    and array_to_string(colors, ',') ~ '^#[0-9a-f]{6}([0-9a-f]{2})?(,#[0-9a-f]{6}([0-9a-f]{2})?)*$'
  ),
  created_at timestamptz not null default now()
);
create index saved_palettes_user_idx on public.saved_palettes (user_id, created_at);
alter table public.saved_palettes enable row level security;
create policy "People keep their own palettes"
  on public.saved_palettes for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
revoke all on public.saved_palettes from anon, authenticated;
grant select, insert, delete on public.saved_palettes to authenticated;

create function public.limit_saved_palettes() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (select count(*) from public.saved_palettes where user_id = new.user_id) >= 100 then
    raise exception 'You can keep up to 100 palettes. Delete one to save another.';
  end if;
  return new;
end;
$$;
create trigger limit_saved_palettes before insert on public.saved_palettes
  for each row execute function public.limit_saved_palettes();
