alter table public.notifications add column feedback_id bigint references public.feedback(id) on delete cascade;
alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in (
  'art_rejected', 'like', 'comment', 'save', 'remix', 'download',
  'share_invite', 'share_role', 'share_removed', 'feedback_status'
));

create table public.feedback_status_history (
  id bigint generated always as identity primary key,
  feedback_id bigint not null references public.feedback(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  previous_status text not null,
  status text not null,
  created_at timestamptz not null default now()
);
alter table public.feedback_status_history enable row level security;
create policy "Signed in people see feedback history" on public.feedback_status_history
  for select to authenticated using (true);
revoke all on public.feedback_status_history from anon, authenticated;
grant select on public.feedback_status_history to authenticated;

create function public.set_feedback_status(p_id bigint, p_status text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  item public.feedback%rowtype;
begin
  if not private.is_admin() then raise exception 'Admin access required' using errcode = '42501'; end if;
  if p_status is null or p_status not in ('open','approved','in_development','implemented','declined','closed') then
    raise exception 'Invalid feedback status' using errcode = '22023';
  end if;
  select * into item from public.feedback where id = p_id for update;
  if not found then raise exception 'Feedback not found' using errcode = 'P0002'; end if;
  if item.status = p_status then return; end if;
  update public.feedback set status = p_status where id = p_id;
  insert into public.feedback_status_history (feedback_id, actor_id, previous_status, status)
    values (p_id, auth.uid(), item.status, p_status);
  insert into public.notifications (user_id, kind, tile_name, feedback_id, detail)
    values (item.user_id, 'feedback_status', item.title, p_id, p_status);
end;
$$;
revoke all on function public.set_feedback_status(bigint, text) from public, anon;
grant execute on function public.set_feedback_status(bigint, text) to authenticated;
