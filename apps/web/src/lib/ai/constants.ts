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

/** How many recent messages the AI sees, so it follows the conversation. */
export const MAX_HISTORY = 12;

export const ROUTER_PROMPT = `You follow a conversation in a pixel art editor. Classify the user's LATEST
message; earlier messages are context, so short follow-ups like "and a dog too",
"make it bigger" or "now blue" mean what they refer to. Set intent to:
- generate: they ask for a new picture or a new subject to be drawn, including
  a new separate creature or object next to what is there ("and a dog too").
- edit: any change to what is already drawn — recolour, outline, erase, move,
  resize, add a detail to it (a hat, a sword), change a pose, expression,
  clothes or style.
- chat: a question, a greeting or anything else.
Set subject so it can be understood without the conversation:
- generate: a short plain English description of the new subject only — what
  it is, its pose, its colours, its mood. Never include what is already drawn
  (for "and a dog too" it is just the dog). Do not mention pixel art,
  resolution, outlines, palettes or the background.
- edit: the full request in plain English, naming the thing to change instead
  of "it", "him" or "that".
- chat: leave it empty.`;

/** For plain conversation, so the model answers in words, not fake tool calls. */
export const CHAT_PROMPT =
  "You are the assistant of Pigxel, a pixel art editor. Answer briefly in plain " +
  "text, in the user's language. Never write JSON or pretend to call tools.";

/** Appended to every generation prompt so the model draws a clean sprite. */
/** Keeps the background cut-out-able; shared by new pictures and redraws. */
export const IMAGE_BACKGROUND_RULES = [
  `The background is one solid flat ${CHROMA_KEY_HEX} magenta colour — no gradient, no pattern, no checkerboard.`,
  `The subject itself contains no ${CHROMA_KEY_HEX} magenta.`,
  "Nothing is behind the subject: no backdrop, no scenery, no ground, no platform,",
  "no shadow cast behind or beneath it, no vignette.",
  "No text, no watermark, no border, no extra objects.",
];

export const IMAGE_STYLE_RULES = [
  "crisp hard-edged pixels, no anti-aliasing.",
  "Chunky low-detail sprite: big simple shapes and a clear, readable silhouette, no tiny details.",
  "Limited palette, bold dark outline, strong volumetric shading with one clear light source from the top left.",
  "The subject is centred, fills the frame, and is complete — nothing cropped.",
  ...IMAGE_BACKGROUND_RULES,
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

// ── Precise edits: the model answers with operations (see lib/edit) ─────────

export const EDIT_CRAFT_RULES = `Palette: 3-4 steps per material (outline darkest, shadow, base, highlight);
shift hue too, shadows toward blue/purple, highlights toward yellow/orange.
Outline: one pixel, continuous, in the darkest colour. Light: one direction,
top-left unless asked otherwise. Keep one connected silhouette, no stray
pixels. Never use rect or ellipse on organic shapes; use blit rows instead.`;

export const EDIT_RESPONSE_RULES = [
  "Spend as few operations as possible; never restate unchanged pixels.",
  "Reuse the characters in COLORS; declare a new colour with pal only when needed.",
  "When a REGION is present, every write must land inside it.",
  "Stay inside SIZE. Check the rulers before writing coordinates.",
  "Write summary as one short sentence in the language of the request.",
];

// ── Planning an edit ────────────────────────────────────────────────────────

export const PLAN_RULES = `Decide how to carry out the edit.

mode:
- "ops" for small precise pixel changes that keep everything else: recolour,
  add or fix an outline, erase a part, mirror, change a few pixels.
- "move" when the object only changes position, same size, same look: its
  pixels are copied exactly.
- "redraw" for anything that needs drawing: resize, add or remove a detail,
  change a pose, expression, clothes or style, add detail.

objects: the numbers of ALL objects that change, from OBJECTS. Things are
often drawn in several pieces: an aura, magic effects, particles or a held
item are separate objects — include every piece of what changes. An empty
list means the whole tile or the selected area.

keep: the numbers of objects that must stay exactly as they are but belong
to the scene being changed — for example the character when only its aura
or effects are replaced, or anything the user said to leave untouched. They
are shown to the model for context and put back pixel for pixel afterwards.

target: where the result goes, in tile pixels (x, y of the top-left, w, h).
- Same box as the object when it changes in place.
- A bigger or smaller box to resize: keep the object's proportions and grow
  or shrink around its centre (or keep its feet on the same line when it
  stands on something), staying inside the tile.
- Another box to move it.

instruction: a clear English instruction for the model that makes the change,
naming exactly what changes and saying that everything else stays the same.

summary: one short sentence for the user, in the language of the request.`;
