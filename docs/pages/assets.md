# Assets (`/assets`)

Ready-made sprites, tiles and palettes to start a tile from or drop into one.

**Who can open it:** signed-in people today. ❓ Open to guests, like Explore and profiles.

## Today

- ✅ Four categories (Characters, Items, Nature, Tiles) plus Palettes, as tabs (`?type=`).
- ✅ "All" shows a row per category with "See all"; a category page loads 240 at a time with "Show more".
- ✅ Asset cards with an animated preview; details dialog with size, frames and colours.
- ✅ Start a tile from an asset; copy it; download its PNG sheet or `.pigxel` file.
- ✅ Palettes: 3 presets, download as `.gpl`, or load in the editor.
- ✅ Admins: publish from the editor (File › Publish to Assets…), replace, remove.
- 🔨 Starter set: 21 small assets drawn in code; an admin copies them into the database with "Import starter set".
- ✅ "Couldn't load assets" when loading fails (instead of "No assets yet").

## Planned redesign

### Tags instead of categories

- 📋 Each asset has one or more tags (for example `character`, `animated`, `forest`, `16px`, `ui`).
- 📋 Filter by tag (several at once), and search by name and tag.
- 📋 Admins create, rename and delete tags and set them on assets.
- 📋 Existing categories become the first tags.

### Assets live in the database, not in code

- 📋 Every asset, with its files, is created and managed through the app (publishing from the editor or uploading files), not written in code.
- 📋 Remove the code-drawn starter set and the "Import starter set" button.
- ❓ Keep the 21 starter assets (move them into the database once) or drop them.

### Single assets and packs

- 📋 An asset can be downloaded or used on its own.
- 📋 Packs: a named set of assets with a cover picture, description and tags (for example "Dungeon pack", "Forest tileset").
- 📋 Pack page: every asset in the pack, download the whole pack as one ZIP.
- 📋 An asset can belong to several packs.
- ❓ Start a tile from a whole pack (for example a tileset pack laid out as one tile).

### Free and paid

- 📋 Each asset and each pack is marked free or paid.
- 📋 Free assets and packs: available to everyone with an account.
- 📋 Paid assets and packs: only for people on a paid plan.
- 📋 The paywall is enforced on the server: paid files are stored privately and handed out with short-lived links only to paid users, so they can't be downloaded by URL.
- 📋 Free users see a clear lock and "Available on paid plans" with a link to [Pricing](pricing.md).
- ❓ What free users can see of paid assets: previews (recommended, so they know what they'd get) or nothing.
- ❓ Which plans unlock paid assets: all paid plans (recommended) or only Pro and Advanced.
- ❓ After a subscription ends: work already made with paid assets stays usable (recommended), or not.

### License and credits

- ❓ License text (suggested: use in any project, including commercial; credit appreciated, not required; don't resell or redistribute the assets themselves).
- 📋 Show the license in the asset and pack dialogs and in the [Terms](legal.md).
- 📋 Credit palette authors: PICO-8 (Lexaloffle), Sweetie 16 (GrafxKid), Endesga 32 (Endesga).

## Later

- ❓ Community submissions: artists submit assets, admins approve, shown "by @artist".
- ❓ AI-assisted asset generation for admins (next step after the redesign).
