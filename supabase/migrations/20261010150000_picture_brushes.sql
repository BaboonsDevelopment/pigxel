create table public.picture_brushes (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null check (length(id) between 1 and 100),
  brush jsonb check (brush is null or pg_column_size(brush) < 100000),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
alter table public.picture_brushes enable row level security;
create policy "People keep their own picture brushes"
  on public.picture_brushes for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
revoke all on public.picture_brushes from anon, authenticated;
grant select, insert, update on public.picture_brushes to authenticated;

-- Ignore older offline uploads, including uploads preceding a deletion.
create function public.keep_newer_picture_brush() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.updated_at <= old.updated_at then return null; end if;
  return new;
end;
$$;
create trigger keep_newer_picture_brush before update on public.picture_brushes
  for each row execute function public.keep_newer_picture_brush();
