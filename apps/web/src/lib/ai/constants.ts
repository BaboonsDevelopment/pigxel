import { CHROMA_KEY_HEX } from "@/lib/image/constants";

export const GEMINI_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta";

/** Free tier — used for editing. */
export const DEFAULT_EDIT_MODEL = "gemini-3.5-flash-lite";
/** Paid only (no free tier for images) — used for generation. */
export const DEFAULT_IMAGE_MODEL = "gemini-3.1-flash-image";

export const ROUTER_PROMPT =
  "Classify the user's message in a pixel art editor. " +
  "Set intent to generate if they ask for a new picture to be drawn, " +
  "and to edit if they want to change the existing picture, or for anything else. " +
  "When the intent is generate, set subject to a short plain English description " +
  "of the subject only — what it is, its pose, its colours, its mood. " +
  "Do not mention pixel art, resolution, outlines, palettes or the background. " +
  "Otherwise leave subject empty.";

/** Appended to every generation prompt so the model draws a clean sprite. */
export const IMAGE_STYLE_RULES = [
  "crisp hard-edged pixels, no anti-aliasing.",
  "Limited palette, bold dark outline, strong volumetric shading with one clear light source from the top left.",
  "The subject is centred, fills the frame, and is complete — nothing cropped.",
  `The background is one solid flat ${CHROMA_KEY_HEX} magenta colour — no gradient, no pattern, no checkerboard.`,
  `The subject itself contains no ${CHROMA_KEY_HEX} magenta.`,
  "Nothing is behind the subject: no backdrop, no scenery, no ground, no platform,",
  "no shadow cast behind or beneath it, no vignette.",
  "No text, no watermark, no border, no extra objects.",
];

/** Frame shapes the image model accepts, as width:height. */
export const ASPECT_RATIOS = [
  "1:1",
  "2:3",
  "3:2",
  "3:4",
  "4:3",
  "4:5",
  "5:4",
  "9:16",
  "16:9",
  "21:9",
];
