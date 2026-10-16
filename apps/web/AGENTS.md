<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Pigxel asset style

For any asset pack creation, regeneration, conversion, or animation fix, read and follow `../../.claude/skills/pixel-assets/SKILL.md`. Its frame-registration and final-preview checks apply to every pack, including Crystal Caverns.

For new asset packs, use the established crisp 64×64 pixel-art style by default: large readable pixel clusters, clear silhouettes, limited solid colours, and nearest-neighbour reduction. The `demonic-monsters-64` pack is the visual and conversion reference. When the user explicitly asks for **«якісний»** style, use the more detailed 128×128 treatment exemplified by the Halloween pack. Always inspect the sprites at their final pixel size and place the pack in `/internal/assets` for review; publish only when covered by the user's current or earlier authorization.
