create function private.has_paid_plan(p_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.subscriptions
    where user_id = p_user_id and plan is not null
      and status in ('active', 'trialing', 'past_due'));
$$;
revoke all on function private.has_paid_plan(uuid) from public, anon;
grant execute on function private.has_paid_plan(uuid) to authenticated;

create table public.profile_badges (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references public.profiles(id) on delete set null,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  tile_id uuid references public.tiles(id) on delete set null,
  label text not null check (char_length(label) between 1 and 32),
  message text not null default '' check (char_length(message) <= 200),
  visible boolean not null default false,
  created_at timestamptz not null default now(),
  check (sender_id is distinct from recipient_id)
);
create index profile_badges_recipient_idx on public.profile_badges(recipient_id, created_at desc);
create index profile_badges_sender_idx on public.profile_badges(sender_id, created_at);
alter table public.profile_badges enable row level security;
create policy "People see displayed badges on public profiles or their own gifts"
  on public.profile_badges for select to anon, authenticated using (
    recipient_id = (select auth.uid()) or sender_id = (select auth.uid()) or
    (visible and exists (select 1 from public.profiles p where p.id = recipient_id and p.visibility = 'public'))
  );
create policy "Recipients control badge display" on public.profile_badges for update to authenticated
  using (recipient_id = (select auth.uid())) with check (recipient_id = (select auth.uid()));
create policy "Recipients can remove gifts" on public.profile_badges for delete to authenticated
  using (recipient_id = (select auth.uid()));
revoke all on public.profile_badges from anon, authenticated;
grant select on public.profile_badges to anon, authenticated;
grant update (visible), delete on public.profile_badges to authenticated;

alter table public.notifications add column badge_id uuid references public.profile_badges(id) on delete cascade;
alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in (
  'art_rejected', 'like', 'comment', 'save', 'remix', 'download',
  'share_invite', 'share_role', 'share_removed', 'feedback_status', 'badge_gift'
));

create function public.gift_profile_badge(p_username text, p_tile_id uuid, p_label text, p_message text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare recipient uuid; badge uuid; sender uuid := auth.uid();
begin
  if sender is null or not private.has_paid_plan(sender) then
    raise exception 'A paid plan is required to gift badges' using errcode = '42501';
  end if;
  select id into recipient from public.profiles where username = lower(trim(p_username));
  if recipient is null or recipient = sender then raise exception 'Choose another artist'; end if;
  if exists (select 1 from public.blocks where
    (blocker_id = sender and blocked_id = recipient) or (blocker_id = recipient and blocked_id = sender)) then
    raise exception 'This artist cannot receive your gift';
  end if;
  if p_label is null or char_length(trim(p_label)) not between 1 and 32
     or p_message is null or char_length(p_message) > 200 then raise exception 'Invalid badge details'; end if;
  if not exists (select 1 from public.tiles where id = p_tile_id and user_id = sender
    and visibility = 'public' and review = 'approved' and deleted_at is null) then
    raise exception 'Choose one of your published artworks';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(sender::text || ':badge-gifts', 0));
  if (select count(*) from public.profile_badges where sender_id = sender and created_at > now() - interval '1 day') >= 5 then
    raise exception 'You can gift up to five badges per day';
  end if;
  insert into public.profile_badges(sender_id, recipient_id, tile_id, label, message)
    values (sender, recipient, p_tile_id, trim(p_label), trim(p_message)) returning id into badge;
  insert into public.notifications(user_id, kind, tile_name, actor_id, badge_id)
    values (recipient, 'badge_gift', trim(p_label), sender, badge);
  return badge;
end;
$$;
revoke all on function public.gift_profile_badge(text, uuid, text, text) from public, anon;
grant execute on function public.gift_profile_badge(text, uuid, text, text) to authenticated;

create table public.hiring_profiles (
  user_id uuid primary key default auth.uid() references public.profiles(id) on delete cascade,
  headline text not null default '' check (char_length(headline) <= 80),
  description text not null default '' check (char_length(description) <= 1000),
  contact_url text not null default '' check (contact_url = '' or (contact_url ~ '^https://' and char_length(contact_url) <= 200)),
  available boolean not null default false
);
create table public.hiring_portfolio_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  description text not null default '' check (char_length(description) <= 300),
  url text not null check (url ~ '^https://' and char_length(url) <= 200),
  tile_id uuid references public.tiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index hiring_portfolio_owner_idx on public.hiring_portfolio_items(user_id, created_at desc);

create function private.hiring_visible(p_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.has_paid_plan(p_user_id) and exists (
    select 1 from public.profiles p join public.hiring_profiles h on h.user_id = p.id
    where p.id = p_user_id and p.visibility = 'public' and h.headline <> '' and h.contact_url <> ''
  );
$$;
revoke all on function private.hiring_visible(uuid) from public;
grant execute on function private.hiring_visible(uuid) to anon, authenticated;

alter table public.hiring_profiles enable row level security;
alter table public.hiring_portfolio_items enable row level security;
create policy "Read hiring profiles" on public.hiring_profiles for select to anon, authenticated
  using (user_id = (select auth.uid()) or private.hiring_visible(user_id));
create policy "Paid members create hiring profiles" on public.hiring_profiles for insert to authenticated
  with check (user_id = (select auth.uid()) and private.has_paid_plan((select auth.uid())));
create policy "Paid members edit hiring profiles" on public.hiring_profiles for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()) and private.has_paid_plan((select auth.uid())));
create policy "Read portfolio items" on public.hiring_portfolio_items for select to anon, authenticated
  using (user_id = (select auth.uid()) or private.hiring_visible(user_id));
create policy "Paid members add portfolio items" on public.hiring_portfolio_items for insert to authenticated
  with check (user_id = (select auth.uid()) and private.has_paid_plan((select auth.uid())));
create policy "Owners remove portfolio items" on public.hiring_portfolio_items for delete to authenticated
  using (user_id = (select auth.uid()));
revoke all on public.hiring_profiles, public.hiring_portfolio_items from anon, authenticated;
grant select on public.hiring_profiles, public.hiring_portfolio_items to anon, authenticated;
grant insert (headline, description, contact_url, available), update (headline, description, contact_url, available)
  on public.hiring_profiles to authenticated;
grant insert (title, description, url, tile_id), delete on public.hiring_portfolio_items to authenticated;

create function private.guard_portfolio_item()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text || ':portfolio', 0));
  if (select count(*) from public.hiring_portfolio_items where user_id = new.user_id) >= 12 then
    raise exception 'Your portfolio can contain up to twelve items';
  end if;
  if new.tile_id is not null and not exists (select 1 from public.tiles where id = new.tile_id
    and user_id = new.user_id and visibility = 'public' and review = 'approved' and deleted_at is null) then
    raise exception 'Choose one of your published artworks';
  end if;
  return new;
end;
$$;
create trigger portfolio_guard before insert on public.hiring_portfolio_items
  for each row execute function private.guard_portfolio_item();
