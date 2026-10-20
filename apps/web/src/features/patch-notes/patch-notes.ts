type PatchNote = {
  version: string;
  date: string;
  title: string;
  summary: string;
  sections: { title: string; changes: string[] }[];
};

export const PATCH_NOTES: PatchNote[] = [
  {
    version: "0.2",
    date: "2026-10-20",
    title: "Explore together",
    summary:
      "A much bigger editor, a community to share your art with, and a proper home for your projects, assets and lessons.",
    sections: [
      {
        title: "New tools",
        changes: [
          "Curve, contour and polygon shapes, and rectangles with rounded corners.",
          "Gradient, spray, blur and jumble.",
          "A text tool, with your own .ttf, .otf and .woff fonts.",
          "A brush library: save selections as brushes and reuse them.",
          "Stroke stabilization for smoother lines.",
          "Slices, to name parts of a picture and export them on their own.",
        ],
      },
      {
        title: "Selections",
        changes: [
          "Polygon lasso and ellipse marquee.",
          "Expand, contract or border a selection, and fill or stroke it.",
          "Rotate and flip just the selected pixels.",
          "Reselect, and save selections to load them again later.",
          "Paste as a new layer or a new tile.",
        ],
      },
      {
        title: "Colours & effects",
        changes: [
          "Hue/saturation, brightness/contrast and colour curves.",
          "Invert, despeckle, outline and a convolution matrix.",
          "Replace a colour everywhere, or reduce the picture to fewer colours.",
          "Indexed and grayscale colour modes.",
          "Colour ramps, colour opacity, and palettes saved to your account.",
        ],
      },
      {
        title: "Layers, animation & tiles",
        changes: [
          "Duplicate, flatten, solo and background layers.",
          "Linked cels, cel order, and more frame operations.",
          "Tweening between frames, and new playback modes.",
          "Onion skin settings.",
          "Tilemaps, and a second view to watch tiles repeat as you draw.",
          "Canvases up to 4096×4096.",
        ],
      },
      {
        title: "Workspace",
        changes: [
          "Undo history you can browse.",
          "Canvas size, sprite size, crop and trim.",
          "Custom grids, snapping to the grid, and a movable symmetry centre.",
          "A live preview window and full-screen view.",
          "Your own panel layout and keyboard shortcuts, with an Aseprite preset.",
        ],
      },
      {
        title: "Import & export",
        changes: [
          "Import PNG, JPEG, GIF, WebP and BMP pictures, several frames at once.",
          "Import sprite sheets and cut them into frames.",
          "Export SVG, animated PNG, animated WebP, PNG sequences, sprite sheets and slices.",
          "Export a timelapse video of your drawing.",
        ],
      },
      {
        title: "Your projects",
        changes: [
          "Folders, labels and pinned projects, with drag and drop.",
          "Archive, trash and bulk actions.",
          "Version history to go back to an earlier save.",
          "Share a project by link, as a viewer or an editor.",
        ],
      },
      {
        title: "Explore",
        changes: [
          "Publish your art to Explore, with tags and a description.",
          "Browse by popular, recent, most liked or A–Z, for any period.",
          "Search arts and artists, filter by tags, canvas size or animation, and see only artists you follow.",
          "Like, download and save arts into your own collections.",
          "Remix arts whose artists allow it.",
          "Comments with replies and likes.",
          "Square previews show the whole art, without cropping.",
        ],
      },
      {
        title: "Community",
        changes: [
          "Notifications for likes, comments, saves, remixes, downloads, follows and shares.",
          "Profiles with a cover, a location, and arts you can sort and filter by tag.",
          "Hide your activity chart if you’d like.",
          "Report arts, comments and profiles, and block people.",
          "A Feedback board to report bugs and vote on features, with a Roadmap of what’s planned, in development and shipped.",
        ],
      },
      {
        title: "Assets & tutorials",
        changes: [
          "Assets: ready-made sprites, tiles and packs to use in your art.",
          "Tutorials that remember which lessons you’ve finished.",
        ],
      },
      {
        title: "Plans",
        changes: [
          "Free keeps every drawing tool and 5 arts in Pigxel cloud.",
          "Artist adds every premium perk and 75 cloud arts, with no AI.",
          "Pro adds the AI helper with monthly tokens, at three levels.",
          "Paid plans get premium assets and tutorials, a premium badge, badges to gift, and a hiring portfolio on your profile.",
        ],
      },
      {
        title: "Account",
        changes: [
          "Sign in with Apple, and show your password while typing it.",
          "Download your data or delete your account from Settings.",
          "Saving to Google Drive has been retired; your art lives in Pigxel cloud.",
        ],
      },
    ],
  },
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
