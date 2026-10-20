-- Discord roles by plan: the bot gives Artist or Pro, and reads (never
-- changes) the Creator role the team gives by hand. synced_premium stays true
-- while the bot's Artist or Pro role is held.
alter table public.discord_connections
  add column synced_role text check (synced_role in ('artist', 'pro', 'creator'));
