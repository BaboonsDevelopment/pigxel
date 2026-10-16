-- A block can pick the background colour its asset cards show on the Assets
-- page. Empty means the default pastel tint.

alter table public.asset_blocks
  add column background text check (background ~ '^#[0-9a-f]{6}$');
