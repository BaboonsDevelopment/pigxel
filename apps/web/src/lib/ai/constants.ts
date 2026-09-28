import { CHROMA_KEY_HEX } from "@/lib/image/constants";

export const GEMINI_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta";

/**
 * Waits between rounds: each round tries every model once, so a busy model is
 * skipped right away and the pause only comes when all of them are busy.
 */
export const TEXT_RETRY_DELAYS_MS = [1_000, 2_000, 4_000];
/** Fewer rounds for pictures: each attempt can take a long time. */
export const IMAGE_RETRY_DELAYS_MS = [2_000];
/** Longest wait for one attempt, so a hung request fails fast. */
export const TEXT_ATTEMPT_TIMEOUT_MS = 20_000;
export const IMAGE_ATTEMPT_TIMEOUT_MS = 40_000;

/**
 * Free text models, tried in order after `AI_MODEL`. Google often answers 503
 * for one model while another is fine, so there are several.
 */
export const TEXT_MODELS = [
  "gemini-3.6-flash",
  "gemini-3.7-flash",
  "gemini-3.1-flash-lite",
];
/** Paid image models, tried in order after `AI_IMAGE_MODEL` (≈$0.03–0.05 each). */
export const IMAGE_MODELS = [
  "gemini-3.1-flash-image",
  "gemini-3.1-flash-lite-image",
  "gemini-2.5-flash-image",
];

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
