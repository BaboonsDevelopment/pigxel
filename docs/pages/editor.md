# Editor (`/tiles/edit?id=…`)

Where the drawing happens: tools, layers, frames, AI assistant, saving and export.

**Who can open it:** signed-in people. `id` is the project's draft in this browser. Optional `guide=<tutorial>` starts a tutorial coach.

## Header and project tabs

- ✅ Project name (rename in place) and where it's kept, with save status ("Saving…", "All changes saved", "Couldn't save", with Try again).
- ✅ Tabs for several open projects: thumbnail, name, unsaved dot, drag to reorder, close (or middle-click), new-project button.
- ✅ Switching tabs keeps each project's undo history, zoom and selected layer.
- ✅ Missing project: shows "This tile isn't in this browser" instead of a blank tile.

## Tools (24)

Grouped in the toolbar; groups remember the last tool used. Customize which tools show (Window › Customize tools…).

- ✅ **Select:** Rectangle selection, Elliptical selection, Lasso, Polygonal lasso, Magic wand.
- ✅ **Move:** move a selection or the whole layer; scale, rotate, flip, exact position fields, nudge with arrow keys.
- ✅ **Draw:** Pen (pixel-perfect), Brush (round or angled), Spray, Eraser.
- ✅ **Lines and shapes:** Line, Curve, Rectangle, Ellipse, Contour (draw and fill), Polygon.
- ✅ **Fill:** Paint bucket (contiguous, tolerance, sample all layers), Gradient (linear or radial, ordered dither or smooth).
- ✅ **Effects:** Blur, Jumble.
- ✅ **Text and slices:** Text (5 pixel fonts, 1–3× scale), Slice (named areas, nine-patch, pivot).
- ✅ **Tiles:** Place tile on a tilemap layer (right-click clears, Alt+click picks).
- ✅ **Pick colour:** Pipette (left primary, right secondary).
- ✅ Shared options: size, ink modes (simple, alpha compositing, copy colour, lock alpha, shading), opacity, dither density, picture brush.

## Menus

### File

- ✅ New tile…; open from your computer, from Pigxel cloud, or from Google Drive ("Connect Google Drive…" when it isn't connected).
- ✅ Import pictures as frames, or a sprite sheet (frame size, offsets, gaps, order, grid preview).
- ✅ Save to Pigxel cloud or Google Drive; Download `.pigxel`.
- ✅ Export… (see Export below).
- ✅ Publish to Assets… (admins only).

### Edit

- ✅ Undo, Redo, History… (jump to any step).
- ✅ Keyboard shortcuts… (full list).
- ✅ Cut, Copy, Paste, Paste as new layer, Paste as new tile, Delete; works with other apps' clipboards.
- ✅ Insert asset… (first frame, as a movable selection).
- ✅ Transform: flip horizontally or vertically, rotate 90° right or left.
- ✅ Paint: fill selection, stroke selection…, outline…, replace colour….
- ✅ Adjust: hue/saturation, brightness/contrast, colour curve, invert colours, despeckle, convolution matrix.
- ✅ Brush: use selection as brush, back to the normal brush.

### Select

- ✅ Select all, deselect, invert, reselect.
- ✅ Modify: expand, contract, border.
- ✅ Save selection, load saved selection.

### Tile

- ✅ Canvas size (anchor, no scaling), sprite size (nearest, bilinear, RotSprite), crop to selection, trim empty edges.
- ✅ Rotate 90° right, 90° left, 180°; flip horizontally or vertically.
- ✅ Reduce colours…; colour mode (RGB, indexed, grayscale); pixel ratio (1:1, 2:1, 1:2).

### View

- ✅ Full screen.
- ✅ Onion skin on/off, 1–3 frames each way, onion skin settings….
- ✅ Pixel grid, major grid (8, 16, 32) or custom grid….
- ✅ Mirror drawing (horizontal, vertical, both), "Back to the middle".
- ✅ Tiled mode (horizontal, vertical, both) to check seamless tiles.
- ✅ Second view: another view of the tile at a different zoom, movable and resizable.

### Window

- ✅ Show or hide panels: Tools, Colors, Palette, Tileset, Timeline, Assistant.
- ✅ Customize tools…, Reset layout.

## Panels

- ✅ **Colors:** primary and secondary, picker, recent colours, swap (X).
- ✅ **Palette:** up to 256 colours saved with the tile; add, remove, edit, drag to reorder; 14 presets; extract from the frame; import `.gpl`, `.hex`, Paint.NET or a picture; save as `.gpl`.
- ✅ **Tileset:** tilemap layers ("Turn this layer into tiles"), tile size, pick a tile to place, tile swatches.
- ✅ **Timeline:** layers and frames as a grid of cels.
  - Layers: normal, background, group, reference, tilemap; rename, show/hide, lock, opacity, 19 blend modes, reorder, group, delete.
  - Frames: new empty or duplicate, reorder, delete, duration per frame (1–65,535 ms), play/pause.
  - Frame tags: named frame ranges with colour and direction (forward, reverse, ping-pong).
- ✅ **Preview:** plays the animation while you draw; fit, real size or 2×.
- ✅ **Assistant:** the AI chat (below).
- ✅ Panels dock left, right or bottom, can be resized, collapsed or hidden; the layout is remembered.

## Canvas

- ✅ Zoom (mouse, trackpad, pinch, + and −), pan (Space-drag or middle button), checkerboard for transparency.
- ✅ Drag and drop pictures or `.pigxel` files onto the editor.
- ✅ Locked or hidden layers can't be painted by mistake; selections limit where paint goes.

## AI assistant

- ✅ Chat in any language; it decides whether to chat, generate, edit, undo or animate.
- ✅ Generate: draws new subjects as new layers, up to six at once, with reference pictures (up to three).
- ✅ Edit: changes parts of the art while keeping the rest; you can adjust the area first.
- ✅ Animate: up to 12 frames, added to the timeline and played.
- ✅ Reviews its own result and retries once when something is clearly wrong; every change can be undone.
- ✅ Credits shown with usage history; clear messages for no credits, AI unavailable or network errors.
- ❓ Generated pictures in the chat are kept only on this device; decide whether they should follow you to other devices.
- ❓ Credits per plan and monthly reset ([pricing.md](pricing.md)).

## Saving

- ✅ Every project has its own draft in this browser, so it survives reloads.
- ✅ Autosave to Pigxel cloud or Google Drive 1.5 s after changes; newer edits are never marked saved by an older save.
- ✅ Save (Mod+S) saves to where the project lives, or downloads it if it's only in the browser.

## Export

- ✅ Still images: PNG, JPEG (current frame).
- ✅ Animation: GIF, Animated PNG, Animated WebP, PNG sequence.
- ✅ Sprite sheet: row, column, grid or packed; all frames, each layer or each tag; optional JSON data (array or hash, Aseprite-compatible).
- ✅ Slices: each slice as its own PNG.
- ✅ Scale 1–20×, keeps pixels sharp; optional pixel-ratio stretch; hidden and reference layers left out.
- ✅ **Timelapse video** (MP4, WebM fallback): five drawing styles (row by row, colour by colour, layer by layer, scatter, from the centre), square or vertical 9:16, 5/10/15 s of drawing, ending with the Pigxel logo; progress bar and cancel.
- 📋 On phones, open the share sheet (TikTok, Instagram…) instead of only downloading the timelapse.
- 📋 Load the video library only when a timelapse is exported (smaller download).
- ❓ Replay of real brush strokes (needs edit history saved in the file).

## Learning and admin

- ✅ Tutorial coach (`?guide=`): points at the right tool or menu and ticks steps off as you do them.
- ✅ Publish to Assets (admins): name, category, replace an existing asset.
- 📋 Publish to Assets with tags, free/paid, and adding to packs ([assets.md](assets.md)).
- 📋 Insert asset: paid assets need a paid plan.
