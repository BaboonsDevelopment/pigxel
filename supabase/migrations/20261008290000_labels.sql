create table public.labels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 30),
  color text not null check (color ~ '^#[0-9a-f]{6}$'),
  created_at timestamptz not null default now()
);

create unique index labels_user_id_name_idx on public.labels (user_id, lower(name));

alter table public.labels enable row level security;

create policy "Labels are visible to their owner"
  on public.labels for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "People create their own labels"
  on public.labels for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "People edit their own labels"
  on public.labels for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "People delete their own labels"
  on public.labels for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.labels from anon, authenticated;
grant select, delete on public.labels to authenticated;
grant insert (name, color), update (name, color) on public.labels to authenticated;

create table public.tile_labels (
  tile_id uuid not null references public.tiles (id) on delete cascade,
  label_id uuid not null references public.labels (id) on delete cascade,
  primary key (tile_id, label_id)
);

create index tile_labels_label_id_idx on public.tile_labels (label_id);

alter table public.tile_labels enable row level security;

create policy "Tile labels are visible to their owner"
  on public.tile_labels for select to authenticated
  using (
    exists (
      select 1 from public.labels
      where labels.id = label_id and labels.user_id = (select auth.uid())
    )
  );

create policy "People label their own tiles"
  on public.tile_labels for insert to authenticated
  with check (
    exists (
      select 1 from public.labels
      where labels.id = label_id and labels.user_id = (select auth.uid())
    )
    and exists (
      select 1 from public.tiles
      where tiles.id = tile_id and tiles.user_id = (select auth.uid())
    )
  );

create policy "People unlabel their own tiles"
  on public.tile_labels for delete to authenticated
  using (
    exists (
      select 1 from public.labels
      where labels.id = label_id and labels.user_id = (select auth.uid())
    )
  );

revoke all on public.tile_labels from anon, authenticated;
grant select, delete on public.tile_labels to authenticated;
grant insert (tile_id, label_id) on public.tile_labels to authenticated;
