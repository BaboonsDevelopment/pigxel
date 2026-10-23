-- Pack names never carry a size ("Pirate Crew · 64×64"): the Assets page
-- shows it as a badge. Packs imported since the first cleanup brought the
-- size back from their pack.json names; import.ts and the review tool now
-- drop it (packName in scripts/assets/lib/asset.ts, the same pattern).
-- Ids keep theirs, since page addresses use them.

update public.asset_packs
set
  name = btrim(regexp_replace(
    name, '\s*([·|,–—-]\s*)?\(?\s*\d+\s*([x×]\s*\d+|px)\s*\)?\s*$', '', 'i'
  )),
  updated_at = now()
where name ~* '\d+\s*([x×]\s*\d+|px)\s*\)?\s*$'
  and btrim(regexp_replace(
    name, '\s*([·|,–—-]\s*)?\(?\s*\d+\s*([x×]\s*\d+|px)\s*\)?\s*$', '', 'i'
  )) <> '';
