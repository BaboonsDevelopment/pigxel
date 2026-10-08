alter table public.tile_comments add column edited_at timestamptz;

create function private.stamp_comment_edit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.body is distinct from old.body then
    new.edited_at := now();
  end if;
  return new;
end;
$$;

create trigger tile_comments_stamp_edit
  before update on public.tile_comments
  for each row execute function private.stamp_comment_edit();

create policy "People edit their comments"
  on public.tile_comments for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant update (body) on public.tile_comments to authenticated;
