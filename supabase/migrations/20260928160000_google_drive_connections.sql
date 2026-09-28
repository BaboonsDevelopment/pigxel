-- Google Drive access for each person who linked their Google account.
-- The refresh token lets the server issue short-lived Drive access tokens, so
-- autosave keeps working after reloads. It never leaves the server.
create table public.google_drive_connections (
  user_id uuid primary key references auth.users (id) on delete cascade,
  google_email text,
  refresh_token text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.google_drive_connections is
  'Google refresh tokens for Drive (drive.file scope). Server-only: read and written with the secret key.';

-- Row level security with no policies: browsers (anon and authenticated
-- roles) can't read or change tokens; only the server's secret key can.
alter table public.google_drive_connections enable row level security;
revoke all on public.google_drive_connections from anon, authenticated;
