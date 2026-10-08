alter table public.folders add column position integer;

grant update (position) on public.folders to authenticated;
