alter table public.tile_comments
  add column parent_id uuid references public.tile_comments (id) on delete cascade;

create index tile_comments_parent_id_created_at_idx
  on public.tile_comments (parent_id, created_at);

create function private.check_comment_parent()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.parent_id is not null and not exists (
    select 1 from public.tile_comments parent
    where parent.id = new.parent_id
      and parent.tile_id = new.tile_id
      and parent.parent_id is null
  ) then
    raise exception 'Replies go under a comment on the same art'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger tile_comments_check_parent
  before insert on public.tile_comments
  for each row execute function private.check_comment_parent();

grant insert (parent_id) on public.tile_comments to authenticated;
