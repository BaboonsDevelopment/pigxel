alter table public.tiles
  add column description text check (char_length(description) <= 500),
  add column tags text[] not null default '{}'
    check (
      cardinality(tags) <= 5
      and tags <@ array['Buildings', 'Characters', 'Fantasy', 'Environment', 'Icons']
    );
