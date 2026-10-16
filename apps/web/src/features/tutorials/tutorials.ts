import type { StaticImageData } from "next/image";
import type { ToolId } from "@/features/editor/constants";
import buildTileset from "../../../public/art/tutorials/build-tileset.png";
import firstAnimation from "../../../public/art/tutorials/first-animation.png";
import idleAnimation from "../../../public/art/tutorials/idle-animation.png";
import pixelArtBasics from "../../../public/art/tutorials/pixel-art-basics.png";
import shadingHighlights from "../../../public/art/tutorials/shading-highlights.png";

export type GuideState = {
  tool: ToolId;
  color: string;
  frames: number;
  painted: number;
  /** A fingerprint of the visible pixels: changes with any edit. */
  look: number;
  framesDiffer: boolean;
  onion: number;
  grid: number;
  playing: boolean;
  exporting: boolean;
  floating: boolean;
  inserted: number;
};

export type GuideStep = {
  title: string;
  body: string;
  keys?: string[];
  target?: string;
  done?: (now: GuideState, from: GuideState) => boolean;
};

export type Tutorial = {
  slug: string;
  title: string;
  summary: string;
  minutes: number;
  level: "Beginner" | "Intermediate";
  /** Paid plans only; its practice asset is a premium one. */
  premium?: boolean;
  image: StaticImageData;
  youtubeId?: string;
  practice: {
    name: string;
    width: number;
    height: number;
    asset?: string;
    frames?: number;
  };
  steps: GuideStep[];
};

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
        body: "This is a 16 × 16 tile: every square is one pixel. Pinch or turn the mouse wheel to zoom; drag with two fingers or the middle button, or hold Space and drag, to move around.",
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
  {
    slug: "shading-highlights",
    title: "Shading and highlights",
    summary:
      "Give a flat knight volume: choose a light source, build darker and lighter shades, and place shadows, highlights and a crisp rim light.",
    minutes: 20,
    level: "Intermediate",
    premium: true,
    image: shadingHighlights,
    practice: {
      name: "Shaded knight",
      width: 16,
      height: 16,
      asset: "knight",
      frames: 1,
    },
    steps: [
      {
        title: "Choose a light source",
        body: "Decide where the light comes from before you touch a pixel. Top-left is the classic choice: surfaces facing it get lighter, the ones facing away get darker.",
        target: CANVAS,
      },
      {
        title: "Pick up the base colour",
        body: "Choose the Pipette and click the knight’s blue tabard. Every shade you add starts from this colour.",
        keys: ["I"],
        target: tool("Pipette"),
        done: (now, from) => now.tool === "pipette" && now.color !== from.color,
      },
      {
        title: "Choose a darker shade",
        body: "In the palette, pick a darker blue that leans a little towards purple. Shifting the hue as well as the brightness keeps shadows rich instead of muddy.",
        target: PALETTE,
        done: (now, from) => now.color !== from.color,
      },
      {
        title: "Paint the shadows",
        body: "With the Pen, paint the sides facing away from the light: the right edge of the tabard and helmet, and under the arms. Keep shadows in small clusters, not single pixels.",
        keys: ["B"],
        target: CANVAS,
        done: (now, from) => now.tool === "pen" && now.look !== from.look,
      },
      {
        title: "Add highlights",
        body: "Pick a lighter, slightly warmer colour and touch the edges facing the light: the top-left of the helmet and the shoulders. Use highlights sparingly; they’re what catches the eye.",
        target: PALETTE,
        done: (now, from) => now.color !== from.color && now.look !== from.look,
      },
      {
        title: "Avoid pillow shading",
        body: "Shading every edge the same way, dark outside and light in the middle, makes a puffy “pillow”. Check that each shadow sits on the side away from your light.",
        target: CANVAS,
      },
      {
        title: "Check it at real size",
        body: "Zoom out until the knight is tiny. Shading that’s too subtle disappears at 1×; if it does, push the shadows a step darker.",
        keys: ["−", "+"],
        target: CANVAS,
      },
      {
        title: "Export it",
        body: "Open File › Export… and save a PNG scaled up 8× to share your shaded knight.",
        keys: ["Mod+E"],
        target: menu("File"),
        done: (now) => now.exporting,
      },
    ],
  },
  {
    slug: "idle-animation",
    title: "Animate an idle loop",
    summary:
      "Make a knight breathe: key poses, a one-pixel bob, secondary motion on the plume, timing that feels alive, and a seamless loop.",
    minutes: 24,
    level: "Intermediate",
    premium: true,
    image: idleAnimation,
    practice: {
      name: "Idle knight",
      width: 16,
      height: 16,
      asset: "knight",
      frames: 1,
    },
    steps: [
      {
        title: "Study the rest pose",
        body: "An idle loop is a character doing almost nothing, convincingly. Frame 1 is the knight at rest; every other frame is a small change from it.",
        target: TIMELINE,
      },
      {
        title: "Duplicate the frame",
        body: "Copy frame 1 into frame 2, so you only redraw what moves.",
        keys: ["Alt+N"],
        target: DUPLICATE_FRAME,
        done: (now) => now.frames >= 2,
      },
      {
        title: "Turn on onion skin",
        body: "View › Onion skin shows frame 1 faintly under frame 2, so you can see exactly how far things move.",
        keys: ["F3"],
        target: menu("View"),
        done: (now) => now.onion > 0,
      },
      {
        title: "Bob the body down",
        body: "On frame 2, select the head and body (not the feet) and nudge them one pixel down, then press Enter. One pixel is plenty at this size.",
        keys: ["M", "↓", "Enter"],
        target: CANVAS,
        done: (now) => now.framesDiffer,
      },
      {
        title: "Let the plume follow",
        body: "Secondary motion sells it: on frame 2, shift the red plume one pixel back so it trails behind the helmet.",
        keys: ["B"],
        target: CANVAS,
        done: (now, from) => now.look !== from.look,
      },
      {
        title: "Add an in-between",
        body: "Duplicate again and make a halfway frame: body down, plume still catching up. Three or four frames make a smooth breath.",
        keys: ["Alt+N"],
        target: DUPLICATE_FRAME,
        done: (now) => now.frames >= 3,
      },
      {
        title: "Play the loop",
        body: "Press Play and watch it a few times. If the loop jumps when it wraps around, the last frame and frame 1 are too different.",
        keys: [",", "."],
        target: 'button[title="Play"], button[title="Pause"]',
        done: (now) => now.playing,
      },
      {
        title: "Tune the timing",
        body: "Idles feel natural when they’re slow. Hold the rest pose longer than the others, around 400 ms, and keep the in-betweens short.",
        target: '[data-guide="frame-duration"]',
      },
      {
        title: "Export a GIF",
        body: "Open File › Export… and choose GIF, or Sprite sheet for a game engine.",
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

export function videoEmbedUrl(youtubeId: string) {
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(youtubeId)}?rel=0`;
}

/**
 * The tutorials Home suggests: ones the person can open (free, or premium
 * with access) and hasn't finished come first; finished ones fill the rest.
 * Tutorials they can't open are never suggested.
 */
export function suggestedTutorials<
  T extends { slug: string; premium?: boolean },
>(
  tutorials: readonly T[],
  { premium, finished }: { premium: boolean; finished: ReadonlySet<string> },
  limit = 3,
): { tutorial: T; finished: boolean }[] {
  const open = tutorials.filter((tutorial) => premium || !tutorial.premium);
  return [
    ...open.filter((tutorial) => !finished.has(tutorial.slug)),
    ...open.filter((tutorial) => finished.has(tutorial.slug)),
  ]
    .slice(0, limit)
    .map((tutorial) => ({ tutorial, finished: finished.has(tutorial.slug) }));
}
