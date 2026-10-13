-- Premium assets: everyone sees them on the Assets page, but only people on a
-- paid plan (and admins) can open their .pigxel files. Those files live in
-- the private `premium-assets` bucket; the PNG sheets stay in the public
-- `assets` bucket as previews.

alter table public.assets add column premium boolean not null default false;

comment on column public.assets.premium is
  'Paid plans only: its .pigxel file is in the private premium-assets bucket.';

-- Whether the signed-in person is on a paid plan: the same statuses
-- features/billing/subscription.ts treats as paid.
create function private.has_paid_plan()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.subscriptions
    where user_id = (select auth.uid())
      and plan is not null
      and status in ('active', 'trialing', 'past_due')
  );
$$;

revoke execute on function private.has_paid_plan() from public, anon;
grant execute on function private.has_paid_plan() to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('premium-assets', 'premium-assets', false, 1048576, array['application/vnd.pigxel+json'])
on conflict (id) do nothing;

create policy "Paid plans read premium asset files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'premium-assets'
    and (private.has_paid_plan() or private.is_admin())
  );

create policy "Admins upload premium asset files"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'premium-assets' and private.is_admin());

create policy "Admins replace premium asset files"
  on storage.objects for update to authenticated
  using (bucket_id = 'premium-assets' and private.is_admin())
  with check (bucket_id = 'premium-assets' and private.is_admin());

create policy "Admins delete premium asset files"
  on storage.objects for delete to authenticated
  using (bucket_id = 'premium-assets' and private.is_admin());
