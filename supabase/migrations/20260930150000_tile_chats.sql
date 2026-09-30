-- The AI chat of each tile: its messages, and which picture from the AI each
-- layer was made from. Keyed by the id kept inside the tile's .pigxel file,
-- so the chat follows the tile wherever it is saved or opened. Text only: the
-- pictures themselves stay in the browser's cache.
create table public.tile_chats (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tile_id uuid not null,
  messages jsonb not null default '[]'::jsonb
    check (jsonb_typeof(messages) = 'array'),
  sources jsonb not null default '{}'::jsonb
    check (jsonb_typeof(sources) = 'object'),
  updated_at timestamptz not null default now(),
  primary key (user_id, tile_id)
);

-- Each person can only see and change their own chats.
alter table public.tile_chats enable row level security;

create policy "Tile chats are visible to their owner"
  on public.tile_chats for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "People create their own tile chats"
  on public.tile_chats for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "People update their own tile chats"
  on public.tile_chats for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "People delete their own tile chats"
  on public.tile_chats for delete to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.tile_chats to authenticated;
revoke all on public.tile_chats from anon;
