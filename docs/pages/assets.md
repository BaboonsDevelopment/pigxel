# Assets (`/assets`)

Ready-made sprites, tiles and palettes to start a tile from or drop into one.

**Who can open it:** signed-in people today. ❓ Open to guests, like Explore and profiles.

## Today

- ✅ Tabs ordered All assets, Packs, Palettes (`?tab=`), with the existing Packs default.
- ✅ Soft pink page, outlined tabs, full-width search and a Filters control with its active count.
- ✅ Spacious responsive gallery: Comfortable and Compact densities with distinct column counts at every breakpoint. Compact always fits one extra column with tighter gaps; phones use one large Comfortable card or two Compact cards per row. Larger previews, two-line names, and dimensions/counts below. Density is remembered per browser.
- ✅ Sorting and the result count stay visible above the gallery.
- ✅ Size, motion, tags, access, pack and favourites live in an overlay drawer. Changes are drafted, matching counts are previewed, and Show results applies the selection; closing or pressing Escape discards it. Opening filters never changes the grid width.
- ✅ Applied filters have removable chips and Clear filters preserves search/sort. Tag suggestions appear while typing `#` when tags exist; a lone hash does not filter results or enter the URL. With no tags available, search simply prompts for names.
- ✅ Native modal focus handling, keyboard navigation for tabs/density/tag suggestions, visible favourites on touch devices, and recoverable loading/pagination errors.
- ✅ The navigation illustration is softened on Assets so the artwork has more emphasis.
- ✅ All assets loads more as you scroll and can show recently used assets separately.
- ✅ Asset cards with an animated preview; details dialog with size, frames and colours. “Back to Assets” closes the preview and navigates to Assets; Close dismisses the preview in place. Both stay above the preview on desktop/mobile.
- ✅ Pack pages have a visible “Back to Assets” button that always navigates to Assets, regardless of the previous page.
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
