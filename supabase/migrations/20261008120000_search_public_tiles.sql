create extension if not exists pg_trgm with schema extensions;

create function public.search_public_tiles(query text)
returns setof public.tiles
language sql
stable
security invoker
set search_path = ''
as $$
  with input as (
    select
      left(lower(btrim(query)), 100) like '@%' as handle,
      ltrim(left(lower(btrim(query)), 100), '@') as phrase
  ),
  words as (
    select array(
      select word
      from unnest(regexp_split_to_array(input.phrase, '[^[:alnum:]_]+')) word
      where word <> ''
      limit 6
    ) as list
    from input
  )
  select tiles.*
  from public.tiles
  join public.profiles on profiles.id = tiles.user_id
  cross join input
  cross join words
  cross join lateral (
    select
      count(*) filter (where field.best >= 0.45) as matched,
      count(*) as total,
      coalesce(sum(field.weighted), 0) as score
    from unnest(words.list) word
    cross join lateral (
      select
        case when input.handle then 0 else
          case when strpos(lower(tiles.name), word) > 0 then 1
               when length(word) >= 4
                 then extensions.word_similarity(word, lower(tiles.name))
               else 0 end
        end as name,
        case when input.handle then 0 else
          coalesce((
            select max(
              case when starts_with(lower(tag), word) then 1
                   when length(word) >= 4
                     then extensions.word_similarity(word, lower(tag))
                   else 0 end
            )
            from unnest(tiles.tags) tag
          ), 0)
        end as tag,
        greatest(
          case when starts_with(profiles.username, word)
                 or strpos(lower(coalesce(profiles.display_name, '')), word) > 0
               then 1 else 0 end,
          case when length(word) >= 4 then greatest(
            extensions.word_similarity(word, profiles.username),
            extensions.word_similarity(
              word, lower(coalesce(profiles.display_name, ''))
            )
          ) else 0 end
        ) as author,
        case when input.handle then 0 else
          case when strpos(lower(coalesce(tiles.description, '')), word) > 0
                 then 1
               when length(word) >= 5 then extensions.word_similarity(
                 word, lower(coalesce(tiles.description, ''))
               )
               else 0 end
        end as description
    ) part
    cross join lateral (
      select
        greatest(part.name, part.tag, part.author, part.description) as best,
        greatest(
          part.name * 3, part.tag * 2.5, part.author * 2, part.description
        ) + (part.name + part.tag + part.author + part.description) * 0.2
          as weighted
    ) field
  ) hit
  left join lateral (
    select count(*) as total
    from public.tile_likes
    where tile_likes.tile_id = tiles.id
  ) likes on true
  where tiles.visibility = 'public'
    and hit.total > 0
    and hit.matched = hit.total
  order by
    hit.score
      + case when lower(tiles.name) = input.phrase then 5
             when starts_with(lower(tiles.name), input.phrase) then 2
             else 0 end
      + ln(1 + likes.total) * 0.3
      desc,
    tiles.published_at desc,
    tiles.id;
$$;

revoke execute on function public.search_public_tiles(text) from public;
grant execute on function public.search_public_tiles(text) to anon, authenticated;
