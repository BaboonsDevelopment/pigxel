-- The team can pin packs: pinned packs show first on the Packs tab, with a
-- badge, the most recently pinned first. Empty means not pinned. Admins
-- already change packs through the existing policies.

alter table public.asset_packs add column pinned_at timestamptz;

comment on column public.asset_packs.pinned_at is
  'When the team pinned it to the top of the Packs tab; null when not pinned.';
