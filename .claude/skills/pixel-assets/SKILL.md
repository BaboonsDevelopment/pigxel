---
name: pixel-assets
description: Create, regenerate, convert, animate, review, and publish Pigxel pixel-art asset packs. Use for sprites, creatures, characters, props, plants, tiles, review fixes, and animation alignment.
---

# Pigxel pixel assets

Use this workflow for **every** asset pack, including Halloween, Volcanic Caldera, Crystal Caverns, and future packs. Work in `apps/web`; source JSON lives in `scripts/assets/packs/<pack>/`. Keep generated source images and exact prompts in `output/<pack>/` when using ImageGen. Treat supplied screenshots as visual references; if the user says a reference shows *forms*, borrow forms without copying its style.

## Interpret the request

- Default or «звичайний» style: crisp **64×64** art, using `demonic-monsters-64` as the conversion reference. When the user explicitly says «якісний», use the more detailed **128×128** Halloween treatment. An explicit size overrides either default.
- Respect the requested count, category, subjects, and animation scope. Do not assume every pack needs the same count or that half its creatures must animate; use those proportions only when requested. Vary silhouettes, proportions, poses, and creature types. Avoid making everything chibi or humanoid when the brief calls for wider variety.
- Add to an existing pack or block when the user names one. Give assets short, evocative descriptions, usually one or two brief sentences. Keep conversion notes and prompts out of public descriptions.
- The final *logical sprite*, not the large generated image, is the artwork to judge. Design for readable target-size pixels from the start.

## Draw and convert

1. Plan each sprite's silhouette, focal point, palette, target dimensions, and transparent margin. For animation, plan distinct poses and a fixed body/ground anchor first.
2. For generated raster art, use ImageGen for each distinct subject. Ask for large, deliberate pixel clusters and a simple, recognizable composition that survives reduction. Save the source and exact prompt under `output/<pack>/`.
3. Convert using nearest-neighbour sampling and deliberate solid-colour palette reduction. Do **not** introduce smoothing, blur, anti-aliasing, soft gradients, or dithering. Avoid noisy single pixels and excess microdetail. If the source looks good but the converted sprite is muddy, simplify or regenerate the source rather than accepting a poor transfer.
4. Use the canvas well: scale the subject as large as its silhouette allows while retaining a small clear margin on all sides. Never cut off limbs, tails, wings, or props. If a wide subject cannot fit a square, widen **that asset's tile** instead of cropping it or shrinking the whole pack.
5. Write `<id>.json`, add its ID to `pack.json`'s `assets` list, then render and **inspect the actual final-size PNG**. Fix until the silhouette and important details read immediately. Check the pack contact sheet for consistent palette, outlines, light, detail density, and pixel scale.

Use a limited palette with clear contrast between neighbouring materials. Keep outlines and light direction consistent within a pack. Tiles must repeat without visible seams. Preserve recognizable details of approved source art while removing details too fine for the output size.

## Animation: register every frame

- Animate a real idle action with coherent poses: a head or gaze turn, breathing, cloak movement, a tail or wing adjustment, etc. Do not fake idle by stretching, uniformly scaling, or sliding the entire sprite. For a 5–6-frame request, make the transition and last-to-first loop smooth; do not replace it with two abrupt poses.
- All frames must have identical canvas dimensions, subject scale, and **both horizontal and vertical registration**. Keep planted feet on one ground line; for flying or crawling creatures, define and hold a stable body anchor while only the intended parts move. Preserve intentional motion without letting the entire figure wander left/right or up/down.
- Keep a clear margin in every frame. Remove stray disconnected fragments and prevent one frame or neighbouring sprite-sheet cell from bleeding into another.
- From `apps/web`, run `node scripts/assets/fix-animation-alignment.cjs scripts/assets/packs/<pack> --apply` on **every generated animated pack**, including Crystal Caverns. This writes aligned frames back to source JSON; a preview-only correction is insufficient. Re-run without `--apply` and require zero remaining corrections. Inspect **every frame and the loop**, because automatic alignment can misread an intentional pose; repair such cases by hand or with an explicit anchor.
- When changing the alignment helper itself, run `node --test scripts/assets/fix-animation-alignment.test.cjs`.

## Validate and show the result

Run from `apps/web`:

| Command | Purpose |
| --- | --- |
| `pnpm assets:render --only <id>` | Render one asset for pixel-level inspection |
| `pnpm assets:render --pack <pack>` | Render the pack and contact sheet |
| `pnpm assets:check --pack <pack>` | Check schema, art, palette, and review state |
| `pnpm dev` → `/internal/assets` | Verify the user's actual review preview |
| `pnpm assets:build` | Build approved, valid assets |
| `pnpm assets:import [--dry-run]` | Import an authorized build to production |

Require zero errors; investigate warnings and fix unintended ones. Check the rendered sprites at 1× and in the app preview. Confirm `/internal/assets` shows the expected pack, count, images, animations, and review states; CLI output alone does not prove the assets are visible there. If review is empty, diagnose the review snapshot/filter or server state before claiming delivery. Provide a contact sheet or representative previews so the user can judge the result.

Read review notes and fix the specific rejected or “To fix” assets. Keep `pack.json` and listed JSON files in sync so missing files cannot invalidate the whole pack. Do not write `review.json` or silently approve on the user's behalf. Publish/import only when covered by the user's current or earlier authorization; generation alone does not imply publication.

## JSON essentials

`id` is unique kebab-case and matches the file name. `kind` is `sprite` or seamless `tile`. Each frame is an array of equal-length strings: `.` means transparent; every other character must map to a lowercase `#rrggbb` in `colors`. Frames of one asset share dimensions. Use `clips` with `kind: "animation"` for a looping action and `kind: "variant"` for alternatives; set frame timing deliberately. `pack.json` defines the palette and display order. Keep every source ID it lists present on disk.
