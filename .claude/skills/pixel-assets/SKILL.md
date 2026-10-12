---
name: pixel-assets
description: Draw, check and ship pixel-art assets for the Pigxel Assets page (sprites, items, nature, seamless tiles, animations). Use when asked to draw, add, redraw or fix assets or asset packs, to act on review notes, or to build or upload assets.
---

# Pixel assets

Assets are drawn by hand as JSON pixel grids in `apps/web/scripts/assets/packs/<pack>/`, rendered, looked at, checked automatically, approved by a person in the review page, and only then built and uploaded. Run every command from `apps/web`.

| Command | What it does |
| --- | --- |
| `pnpm assets:render --only <id>` | Writes `scripts/assets/out/render/<pack>/<id>.png` (frames ×8 on a checkerboard, tiles also 3×3) and prints the path |
| `pnpm assets:check [--only <id>]` | Schema, palette and art checks, review state, and reviewers' notes |
| `pnpm assets:review` | Review page at http://localhost:4870 — the user approves or rejects |
| `pnpm assets:build` | Builds approved, error-free assets into `scripts/assets/out/` |
| `pnpm assets:import [--prune] [--dry-run]` | Uploads the build to the hosted Supabase |

## The loop — for every asset

1. **Plan** before drawing: size, silhouette, the 3–4 colour ramp per material from the pack palette, where the light comes from, and for animations the key poses.
2. **Write** `packs/<pack>/<id>.json` and add the id to `"assets"` in `pack.json` (that order is the page order).
3. **Render** with `pnpm assets:render --only <id>`, then **Read the PNG**. Never judge a drawing from its grid alone.
4. **Critique** the render against the checklist below as a strict art director: say what is wrong, specifically.
5. **Fix** and render again. Repeat until it passes the checklist — usually 2–4 rounds. If an asset still looks weak after several rounds, simplify it rather than adding detail.
6. Run `pnpm assets:check --only <id>`: no errors, and every warning either fixed or deliberate (say why in `"notes"`).
7. When a batch is done, render the contact sheet (`pnpm assets:render --pack <pack>`), Read `out/render/contact.png` and check the set looks like one game.

Never write to `review.json` — approval is the user's. Never run `assets:import` without the user asking; it writes to the hosted project. Acting on review: `pnpm assets:check` prints each rejected asset's note; redraw from it, and the asset returns to review on its own.

## File format

```json
{
  "id": "slime",
  "name": "Slime",
  "category": "characters",
  "tags": ["character", "enemy", "animated"],
  "colors": { "k": "#181425", "d": "#265c42", "g": "#3e8948", "l": "#63c74d", "w": "#ffffff" },
  "clips": [
    { "name": "idle", "kind": "animation", "ms": 180, "frames": [["....kkkk....", "..."], ["..."]] }
  ],
  "notes": "Optional: anything a reviewer should know."
}
```

- `id` is kebab-case, the file name, and unique across all packs. `category` is one of `characters`, `items`, `nature`, `tiles`.
- Each frame is a list of equal-length row strings; `.` is clear, every other character is a key in `colors`. All frames of an asset have the same size.
- `colors` values are lowercase `#rrggbb` from the pack's palette (`pack.json` → `palette`; `endesga-32` is in `apps/web/src/lib/palette/presets.ts`). Pick mnemonic keys: `k` outline, `d`/`m`/`l` dark/mid/light, `w` highlight.
- `kind: "animation"` loops its frames (`ms` per frame, `direction` `forward` or `pingpong`); `kind: "variant"` is a set of alternatives (open/closed chest, full/empty heart). An asset can have several clips (`idle`, `walk`).
- `slices` (optional) mark 9-slice UI: `{ "name", "x", "y", "w", "h", "border" }`.

## Sizes

Items and small props 16×16. Characters 16×16 (chibi) or 16×24 / 24×24. Trees and large props up to 32×32 or 32×48. Tiles 16×16. Keep one scale across a pack: a coin is smaller than a chest, which is smaller than a hero.

## Art checklist

**Silhouette** — It reads as what it is at 1× and filled black. Big simple shapes first, then detail; one clear focal point. Use the canvas: leave 1px margin, no cramped corner drawings.

**Outline** — 1px outline in the pack outline colour (`style.outline`) around sprites. Inner lines and the light side may use a dark tone of the local colour (selective outline). No double-thick outlines, no outline on tiles.

**Light and shading** — One light from the top-left on every asset. Each material gets a ramp of 3–4 tones: shadow, base, light, and a sparing highlight. Shade by form (what faces away from the light is darker), never by concentric rings ("pillow shading"). Shift hue along the ramp: shadows cooler/redder-purple, highlights warmer/yellower, rather than only darker/lighter of one hue.

**Clean pixels** — Curves and diagonals use consistent step lengths (1-1-1, 2-2-2, 2-1-2-1), no random jaggies. No lone stray pixels, no checkerboard dither on sprites this small, no parallel bands of equal-width colour following the outline (banding). Anti-alias sparingly, only to soften a hard step.

**Colour** — Few colours, chosen on purpose; contrast between neighbouring materials. Characters need readable faces: eyes are 1–2px, high contrast.

**Tiles** — Fully opaque, seamless: the 3×3 render must show no visible grid. Texture is sparse and evenly spread, no feature crossing an edge unless it continues on the other side, no single standout detail that repeats into an obvious pattern. Low contrast so sprites stand out on top.

**Animation** — Idle 2–4 frames (breathing, bobbing 1px), walk 4–6 frames, effects 4–8 frames. Keep the ground line fixed, no 1px wobble of the whole body unless intended, change as few pixels per frame as reads clearly. Loops must join smoothly from last frame to first.

**Set consistency** — Same palette subset, outline, light direction, detail density and pixel scale across the pack.
