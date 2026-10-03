import type { StaticImageData } from "next/image";
import type { ToolId } from "@/components/tile-editor/constants";
import buildTileset from "../../../public/art/tutorials/build-tileset.png";
import firstAnimation from "../../../public/art/tutorials/first-animation.png";
import pixelArtBasics from "../../../public/art/tutorials/pixel-art-basics.png";

/** What a guide sees of the editor, to tell when a step is done. */
export type GuideState = {
  tool: ToolId;
  /** The primary colour. */
  color: string;
  frames: number;
  /** Opaque pixels in the frame on screen. */
  painted: number;
  /** Whether any frame looks different from the first. */
  framesDiffer: boolean;
  /** Onion skin frames each way; 0 is off. */
  onion: number;
  /** The View › Grid size; 0 is none. */
  grid: number;
  playing: boolean;
  exporting: boolean;
  /** Pixels are lifted or pasted and not put down yet. */
  floating: boolean;
  /** How many assets were inserted since the editor opened. */
  inserted: number;
};

export type GuideStep = {
  title: string;
  body: string;
  /** Keys to show; "Mod+" is Ctrl+, or ⌘ on a Mac. */
  keys?: string[];
  /** A CSS selector for what to point at in the editor. */
  target?: string;
  /**
   * Whether the step is done, from the editor now and as it was when the
   * step began. Steps without one are read, then moved past with Next.
   */
  done?: (now: GuideState, from: GuideState) => boolean;
};

export type Tutorial = {
  slug: string;
  title: string;
  summary: string;
  minutes: number;
  level: "Beginner" | "Intermediate";
  image: StaticImageData;
  /** The video on YouTube, once it's up: the `v` in its link. */
  youtubeId?: string;
  /** The tile the interactive guide opens: blank, or one of the assets. */
  practice: {
    name: string;
    width: number;
    height: number;
    asset?: string;
    /** Keeps only the asset's first frames, e.g. 1 to animate it yourself. */
    frames?: number;
  };
  steps: GuideStep[];
};

/** The tool panel's button for the group holding a tool (see ToolBar). */
const tool = (label: string) =>
  `[aria-label="Tools"] [data-tools*="|${label}|"]`;
const menu = (label: string) => `[data-menu="${label}"]`;
const CANVAS = '[data-guide="canvas"]';
const PALETTE = 'section[aria-label="Palette"]';
const TIMELINE = 'section[aria-label="Timeline"]';
const DUPLICATE_FRAME = 'button[title="Duplicate frame (Alt+N)"]';

export const TUTORIALS: Tutorial[] = [
  {
    slug: "pixel-art-basics",
    title: "Pixel art basics",
    summary:
      "Draw your first sprite one pixel at a time: the Pen, the palette, filling, erasing and exporting a crisp PNG.",
    minutes: 8,
    level: "Beginner",
    image: pixelArtBasics,
    practice: { name: "My first sprite", width: 16, height: 16 },
    steps: [
      {
        title: "Your canvas",
        body: "This is a 16 × 16 tile: every square is one pixel. Scroll to zoom, and hold Space and drag to move around.",
        keys: ["Space"],
        target: CANVAS,
      },
      {
        title: "Pick the Pen",
        body: "The Pen puts down one crisp pixel at a time. It’s the tool you’ll use most.",
        keys: ["B"],
        target: tool("Pen"),
        done: (now) => now.tool === "pen",
      },
      {
        title: "Choose a colour",
        body: "Click a swatch in the palette. The left mouse button paints the primary colour, the right one the secondary.",
        target: PALETTE,
        done: (now, from) => now.color !== from.color,
      },
      {
        title: "Draw an outline",
        body: "Click and drag to draw the outline of something simple: a heart, a mushroom, a coin. Keep the lines one pixel thick.",
        target: CANVAS,
        done: (now, from) => now.painted >= from.painted + 12,
      },
      {
        title: "Fill it in",
        body: "Pick the Paint bucket and another colour, then click inside the outline. If the paint spills out, the outline has a gap: undo and close it.",
        keys: ["G"],
        target: tool("Paint bucket"),
        done: (now, from) =>
          now.tool === "bucket" && now.painted > from.painted,
      },
      {
        title: "Fix a mistake",
        body: "The Eraser clears pixels. Rub out a stray one.",
        keys: ["E"],
        target: tool("Eraser"),
        done: (now, from) =>
          now.tool === "eraser" && now.painted < from.painted,
      },
      {
        title: "Undo and redo",
        body: "Every change can be taken back and brought back again, so try things freely.",
        keys: ["Mod+Z", "Mod+Y"],
      },
      {
        title: "Reuse a colour",
        body: "The Pipette picks a colour up from the canvas. With the Pen, hold Alt and click to do the same without switching tools.",
        keys: ["I", "Alt+click"],
        target: tool("Pipette"),
        done: (now, from) => now.color !== from.color,
      },
      {
        title: "Export it",
        body: "Open File › Export… to save a PNG. Scale it up 8× or more so it stays crisp when you share it.",
        keys: ["Mod+E"],
        target: menu("File"),
        done: (now) => now.exporting,
      },
    ],
  },
  {
    slug: "first-animation",
    title: "Your first animation",
    summary:
      "Bring a slime to life: frames, onion skin, squash and stretch, timing, and exporting a looping GIF.",
    minutes: 16,
    level: "Beginner",
    image: firstAnimation,
    practice: {
      name: "Bouncing slime",
      width: 16,
      height: 16,
      asset: "slime",
      frames: 1,
    },
    steps: [
      {
        title: "Meet the timeline",
        body: "Under the canvas, each column is a frame and each row a layer. There’s a slime on frame 1, ready to bounce.",
        target: TIMELINE,
      },
      {
        title: "Duplicate the frame",
        body: "Copy frame 1 into frame 2, so you only change what moves.",
        keys: ["Alt+N"],
        target: DUPLICATE_FRAME,
        done: (now) => now.frames >= 2,
      },
      {
        title: "Turn on onion skin",
        body: "View › Onion skin shows the frames around this one faintly, so you can see where the slime just was.",
        keys: ["F3"],
        target: menu("View"),
        done: (now) => now.onion > 0,
      },
      {
        title: "Squash the slime",
        body: "On frame 2, select everything and nudge it a pixel down, then press Enter. Or redraw it a little flatter and wider.",
        keys: ["Mod+A", "↓", "Enter"],
        target: CANVAS,
        done: (now) => now.framesDiffer,
      },
      {
        title: "Add more frames",
        body: "Duplicate again and change each frame a little: squashed, stretched up, back at rest. Four frames make a smooth bounce.",
        keys: ["Alt+N"],
        target: DUPLICATE_FRAME,
        done: (now) => now.frames >= 4,
      },
      {
        title: "Play it",
        body: "Press Play to watch it loop. Step through the frames to catch any that jump.",
        keys: [",", "."],
        target: 'button[title="Play"], button[title="Pause"]',
        done: (now) => now.playing,
      },
      {
        title: "Tune the timing",
        body: "Each frame shows for 220 ms. Hold the squashed frame a little longer to give the landing some weight.",
        target: '[data-guide="frame-duration"]',
      },
      {
        title: "Export a GIF",
        body: "Open File › Export… and choose GIF to share it, or Sprite sheet for a game engine.",
        keys: ["Mod+E"],
        target: menu("File"),
        done: (now) => now.exporting,
      },
    ],
  },
  {
    slug: "build-tileset",
    title: "Build a tileset",
    summary:
      "Lay out a sheet of 16 × 16 ground tiles from the assets, copy and vary them, and check that they meet without seams.",
    minutes: 32,
    level: "Intermediate",
    image: buildTileset,
    practice: { name: "Ground tileset", width: 64, height: 64 },
    steps: [
      {
        title: "Show a 16 × 16 grid",
        body: "A tileset is a sheet of same-sized tiles. View › Grid › 16 × 16 marks out each one.",
        target: menu("View"),
        done: (now) => now.grid === 16,
      },
      {
        title: "Insert a grass tile",
        body: "Open Edit › Insert asset… and pick Grass under Tiles. It lands in the middle of the sheet, floating, so you can place it.",
        target: menu("Edit"),
        done: (now, from) => now.inserted > from.inserted,
      },
      {
        title: "Put it in the corner",
        body: "Drag it into the top-left cell with the Move tool, or nudge it with the arrow keys. Press Enter to put it down.",
        keys: ["V", "← ↑ → ↓", "Enter"],
        target: CANVAS,
        done: (now) => !now.floating,
      },
      {
        title: "Copy it across",
        body: "Select the tile with Rectangle selection, copy it and paste, then move the copy into the next cell. Fill the top row.",
        keys: ["M", "Mod+C", "Mod+V"],
        target: tool("Rectangle selection"),
        done: (now, from) => now.painted >= from.painted + 256,
      },
      {
        title: "Break the pattern",
        body: "Identical tiles look like wallpaper. Flip a copy, or paint a few flowers and pebbles on it, so the ground looks natural.",
        keys: ["Shift+H"],
        target: CANVAS,
      },
      {
        title: "Add a second ground",
        body: "Insert Dirt, Sand or Water and put it in the next row. Then make an edge tile: let a few grass blades hang over the top of the dirt.",
        target: menu("Edit"),
        done: (now, from) => now.inserted > from.inserted,
      },
      {
        title: "Check the seams",
        body: "Zoom out and look where tiles meet: a seamless tile shows no line or jump there. On a single tile, View › Tiled › Both repeats it around itself, so seams can’t hide.",
        keys: ["−", "+"],
        target: CANVAS,
      },
      {
        title: "Export the sheet",
        body: "Export a PNG at 1× for a game engine: every 16 × 16 cell is one tile.",
        keys: ["Mod+E"],
        target: menu("File"),
        done: (now) => now.exporting,
      },
    ],
  },
];

export function findTutorial(slug: string | null | undefined) {
  return TUTORIALS.find((tutorial) => tutorial.slug === slug) ?? null;
}

/** The video embedded without YouTube's tracking cookies. */
export function videoEmbedUrl(youtubeId: string) {
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(youtubeId)}?rel=0`;
}
