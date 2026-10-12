alter table public.art_reports
  add column reason text not null default 'other'
    check (reason in ('spam', 'inappropriate', 'copyright', 'other')),
  add column details text
    check (char_length(details) <= 500);

grant insert (reason, details) on public.art_reports to authenticated;
