drop policy "People delete their comments and comments on their arts"
  on public.tile_comments;

create policy "People delete their comments"
  on public.tile_comments for delete to authenticated
  using ((select auth.uid()) = user_id);
