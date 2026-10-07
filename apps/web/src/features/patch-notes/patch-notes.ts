type PatchNote = {
  version: string;
  date: string;
  title: string;
  summary: string;
  sections: { title: string; changes: string[] }[];
};

export const PATCH_NOTES: PatchNote[] = [
  {
    version: "0.1",
    date: "2026-09-30",
    title: "Hello, Pigxel",
    summary:
      "The first release: a pixel art editor in your browser with the tools you know from Aseprite, an AI helper, and a home for your art.",
    sections: [
      {
        title: "Drawing",
        changes: [
          "Pen with pixel-perfect lines, round brush, eraser and line.",
          "Rectangle and ellipse, outlined or filled.",
          "Paint bucket and pipette.",
          "Shading ink moves pixels one step along the palette.",
          "Dither patterns for every drawing tool.",
          "Mirror drawing, and tiled mode for seamless tiles.",
        ],
      },
      {
        title: "Selections",
        changes: [
          "Rectangle selection, lasso, magic wand and the Move tool.",
          "Cut, copy and paste, also to and from other apps.",
          "Flip and rotate selected pixels.",
          "Use a selection as a picture brush.",
          "Outline and Replace colour in the Edit menu.",
        ],
      },
      {
        title: "Colours",
        changes: [
          "Primary and secondary colours, and your recent colours.",
          "A palette saved with each tile, with PICO-8, Sweetie 16 and Endesga 32 to start from.",
          "Import palettes from .gpl, .hex or Paint.NET files, and save them as .gpl.",
        ],
      },
      {
        title: "Layers & animation",
        changes: [
          "Layers, groups, blend modes and reference layers.",
          "Frames with their own timing, and playback.",
          "Onion skin shows the frames around the one you draw on (F3).",
          "A grid every 8, 16 or 32 pixels, from the View menu.",
        ],
      },
      {
        title: "Pigxel",
        changes: [
          "Save to Pigxel cloud or Google Drive, and export pictures.",
          "An AI helper that draws, edits and animates with you.",
          "A home for your recent projects.",
          "Profiles with pinned arts and a daily activity chart.",
          "Follow artists, search by @username and get notified of new followers.",
        ],
      },
    ],
  },
];

export function patchDate(iso: string, short = false) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: short ? "short" : "long",
    day: "numeric",
    year: short ? undefined : "numeric",
    timeZone: "UTC",
  });
}
