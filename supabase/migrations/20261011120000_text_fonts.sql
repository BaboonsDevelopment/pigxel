create table public.text_fonts (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 60),
  px integer not null check (px between 4 and 64),
  path text not null check (path like (user_id::text || '/' || id::text || '.%')),
  created_at timestamptz not null default now()
);
create index text_fonts_user_idx on public.text_fonts (user_id, created_at);
alter table public.text_fonts enable row level security;
create policy "People keep their own text fonts"
  on public.text_fonts for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
revoke all on public.text_fonts from anon, authenticated;
grant select, insert, delete on public.text_fonts to authenticated;

create function public.limit_text_fonts() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (select count(*) from public.text_fonts where user_id = new.user_id) >= 20 then
    raise exception 'You can keep up to 20 fonts. Delete one to upload another.';
  end if;
  return new;
end;
$$;
create trigger limit_text_fonts before insert on public.text_fonts
  for each row execute function public.limit_text_fonts();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('text-fonts', 'text-fonts', false, 2097152, array['font/ttf', 'font/otf', 'font/woff', 'font/woff2'])
on conflict (id) do nothing;

create policy "Text font files are visible to their owner"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'text-fonts'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "People upload their own text font files"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'text-fonts'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "People delete their own text font files"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'text-fonts'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
