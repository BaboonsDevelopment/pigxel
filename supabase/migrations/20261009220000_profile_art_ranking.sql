create function public.profile_arts_ranked(
  profile uuid,
  sort text,
  tag text default null,
  skip integer default 0,
  take integer default 40
)
returns table (id uuid)
language sql
stable
security invoker
set search_path = ''
as $$
  select ranked.id
  from (
    select
      t.id,
      t.published_at,
      (select count(*) from public.tile_likes l where l.tile_id = t.id) as likes,
      coalesce(
        (select d.total from public.tile_downloads d where d.tile_id = t.id),
        0
      ) as downloads
    from public.tiles t
    where t.user_id = profile
      and t.visibility = 'public'
      and t.deleted_at is null
      and (tag is null or tag = any(t.tags))
  ) ranked
  order by
    case sort when 'downloads' then ranked.downloads else ranked.likes end desc,
    ranked.published_at desc nulls last,
    ranked.id
  offset greatest(skip, 0)
  limit least(greatest(take, 1), 100);
$$;

grant execute on function public.profile_arts_ranked(uuid, text, text, integer, integer)
  to anon, authenticated;
