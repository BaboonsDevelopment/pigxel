export const GEMINI_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta";

/** Free tier — used for editing. */
export const DEFAULT_EDIT_MODEL = "gemini-3.5-flash-lite";
/** Paid only (no free tier for images) — used for generation. */
export const DEFAULT_IMAGE_MODEL = "gemini-3.1-flash-image";

export const ROUTER_PROMPT =
  "Classify the user's message in a pixel art editor. " +
  "Answer generate if they ask for a new picture to be drawn. " +
  "Answer edit if they want to change the existing picture, or for anything else.";
