create table public.folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  created_at timestamptz not null default now()
);

create index folders_user_id_created_at_idx on public.folders (user_id, created_at);

alter table public.folders enable row level security;

create policy "Folders are visible to their owner"
  on public.folders for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "People create their own folders"
  on public.folders for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "People rename their own folders"
  on public.folders for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "People delete their own folders"
  on public.folders for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.folders from anon, authenticated;
grant select, delete on public.folders to authenticated;
grant insert (name), update (name) on public.folders to authenticated;

alter table public.tiles
  add column folder_id uuid references public.folders (id) on delete set null;

create index tiles_folder_id_updated_at_idx on public.tiles (folder_id, updated_at desc);

create function private.tiles_folder_belongs_to_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.folder_id is not null and not exists (
    select 1 from public.folders
    where folders.id = new.folder_id and folders.user_id = new.user_id
  ) then
    raise exception 'Folder not found' using errcode = '23503';
  end if;
  return new;
end;
$$;

create trigger tiles_folder_belongs_to_owner
  before insert or update of folder_id on public.tiles
  for each row execute function private.tiles_folder_belongs_to_owner();
