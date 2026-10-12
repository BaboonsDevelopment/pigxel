alter table public.tiles
  add column review text check (review in ('pending', 'approved', 'rejected')),
  add column review_requested_at timestamptz,
  add column reviewed_at timestamptz,
  add column review_scores jsonb;

update public.tiles
set review = 'approved', reviewed_at = now()
where visibility = 'public';

create index tiles_review_pending_idx
  on public.tiles (review_requested_at) where review = 'pending';

create function private.guard_tile_review()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;
  if new.visibility = 'public'
    and (tg_op = 'INSERT' or old.visibility is distinct from 'public') then
    raise exception 'Arts go public only after the content check'
      using errcode = '42501';
  end if;
  if tg_op = 'INSERT' then
    new.review := null;
    new.review_requested_at := null;
    new.reviewed_at := null;
    new.review_scores := null;
    return new;
  end if;
  if new.review is distinct from old.review
      and new.review is not null and new.review <> 'pending'
    or new.reviewed_at is distinct from old.reviewed_at
    or new.review_scores is distinct from old.review_scores then
    raise exception 'Only the content check can change a review'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger tiles_guard_review
  before insert or update on public.tiles
  for each row execute function private.guard_tile_review();

create function public.tiles_due_for_review(max_count integer)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.tiles
  where (
      review = 'pending'
      and review_requested_at < now() - interval '1 minute'
    ) or (
      visibility = 'public'
      and review = 'approved'
      and updated_at > reviewed_at
      and updated_at < now() - interval '1 minute'
    )
  order by coalesce(review_requested_at, updated_at)
  limit max_count;
$$;

revoke execute on function public.tiles_due_for_review(integer)
  from public, anon, authenticated;
grant execute on function public.tiles_due_for_review(integer) to service_role;

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('art_rejected')),
  tile_id uuid references public.tiles (id) on delete set null,
  tile_name text not null,
  created_at timestamptz not null default now()
);

create index notifications_user_id_created_at_idx
  on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

create policy "People see their own notifications"
  on public.notifications for select to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;

select cron.schedule(
  'review-published-arts',
  '* * * * *',
  $$
  select net.http_get(
    url := (
      select decrypted_secret from vault.decrypted_secrets
      where name = 'pigxel_app_url'
    ) || '/api/moderation/sweep',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets
        where name = 'pigxel_cron_secret'
      )
    ),
    timeout_milliseconds := 60000
  );
  $$
);
