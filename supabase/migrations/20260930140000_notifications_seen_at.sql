-- When the person last opened their notifications; newer ones show as unread.
alter table public.profiles
  add column notifications_seen_at timestamptz not null default now();

-- People mark their own notifications as seen.
grant update (notifications_seen_at) on public.profiles to authenticated;
