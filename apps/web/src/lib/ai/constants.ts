import { CHROMA_KEY_HEX } from "@/lib/image/constants";

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

export const GEMINI_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta";
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
/**
 * Image models that draw at a chosen size, and the size for a single picture:
 * it is shrunk to a tile anyway, and a smaller picture costs less. Sprite
 * sheets hold several poses, so they keep the default size.
 */
export const SIZED_IMAGE_MODELS = ["gemini-3.1-flash-image"];
export const SMALL_IMAGE_SIZE = "512";

/** How many recent messages the AI sees, so it follows the conversation. */
export const MAX_HISTORY = 12;
/** How many of them the placement planner sees, to know what was drawn. */
export const PLACEMENT_HISTORY = 6;

/**
 * Pictures the user attaches to a message, to draw from: how many at most,
 * and how the router hears of them (it gets only text).
 */
export const MAX_REFERENCES = 3;
export const REFERENCES_NOTE = "[reference pictures attached]";

export const ROUTER_PROMPT = `You follow a conversation in a pixel art editor. Classify the user's LATEST
message; earlier messages are context, so short follow-ups like "and a dog too",
"make it bigger" or "now blue" mean what they refer to. Set intent to:
- generate: they ask for a new picture or a new subject to be drawn, including
  a new separate creature or object next to what is there ("and a dog too").
- edit: any change to what is already drawn — recolour, outline, erase, move,
  resize, add a detail to it (a hat, a sword), change a pose, expression,
  clothes or style.
- undo: they want the last change taken back or the picture as it was
  before ("undo", "put it back", "верни як було").
- animate: they want movement over several frames — an animation, a loop, a
  character doing an action ("a monkey that throws a grenade", "make the cat
  walk", "animate the flag waving"), new or already drawn.
- chat: a question, a greeting or anything else.
Set subject so it can be understood without the conversation:
- generate: a short plain English description of ONE new thing only — what
  it is, its pose, its colours, its mood. Never include what is already drawn
  or where it goes (for "a big carrot above the beaver" it is just "a big
  carrot"). Do not mention pixel art, resolution, outlines, palettes or the
  background.
- edit: the full request in plain English, naming the thing to change instead
  of "it", "him" or "that".
- animate: the full request in plain English: what moves and what happens,
  naming already drawn things instead of "it".
- chat: leave it empty.
For generate also set:
- where: where the user wants it, in plain English ("above the beaver",
  "at the bottom", "next to the apple"); empty when they did not say.
- count: how many to add (1 unless they asked for more, e.g. "5 more apples" is 5).
- name: a short Title Case name for its layer, one or two English words
  ("Monkey", "Red Apple").
For animate also set frames: the number of frames they asked for, 0 when
they did not say.
Otherwise leave where and name empty, count 1 and frames 0.
A message ending in ${REFERENCES_NOTE} came with pictures to draw from
("draw this", "in this style", "make him like this"): drawing something from
them is generate, and subject says what to take from them ("the fox from the
reference picture", "a knight in the style of the reference picture").`;

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

/** Added to a generation prompt when the user attached pictures to draw from. */
export const REFERENCE_RULES =
  "Use the attached picture(s) as reference for what the subject looks like " +
  "(design, shapes, colours, proportions), redrawn in the pixel art style " +
  "below; copy nothing else from them (no background, no text).";

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

summary: one short sentence for the user, in the language of the request,
saying what was done.

question: one or two short sentences for the user, in the language of the
request, used when the target differs from the object: say what you are
about to do (e.g. shrink the beaver to about half) and ask them to move or
resize the highlighted frame on the tile if needed, then press "Generate here".`;

// ── Placing new pictures on a tile that has drawings ───────────────────────

export const PLACEMENT_RULES = `Decide where the new picture(s) go on the tile.

copyOf: when the user asks for more of something already drawn ("5 more
apples", "another one like it", "the same again"), the number of that object
from OBJECTS; it is copied as is instead of drawn anew. Otherwise -1.

areas: one box per new picture, in tile pixels (x, y of the top-left, w, h):
- In empty space (light grey), never covering existing drawings.
- Follow WHERE when given ("above the beaver" goes right above it, "at the
  bottom" goes near the bottom edge).
- Copies sit near the original, spread out, each the same size as it.
- New things get a size that suits the scene: similar in scale to what is
  drawn, bigger or smaller when the request says so, at least 16 pixels a
  side when there is room.

ask: true only when the new picture cannot fit without covering existing
drawings, or the user asked to replace or overlap what is drawn. Then the
user chooses; otherwise false.

question: when ask is true, one short sentence in the language of the request
asking how to add it; otherwise empty.`;

// ── Animations ──────────────────────────────────────────────────────────────

/** Most frames an animation may have. */
export const MAX_FRAMES = 12;
/** Most pictures (paid) one animation may need: one per track. */
export const MAX_TRACKS = 3;

export const ANIMATION_RULES = `Plan a short pixel art animation for the request.

frameCount: how many frames, 4 to 8 for most actions (more for a long or slow
one), at most ${MAX_FRAMES}; use FRAMES when given.
duration: how long each frame shows, in milliseconds: about 100 for most
actions, 60-80 for fast ones, 150-250 for slow ones.
name: a short Title Case name for the animation ("Monkey Throws Grenade").

tracks: one per thing that moves, bottom to top in drawing order, at most
${MAX_TRACKS} (each costs one picture). Things that do not move are not tracks.
- kind "sheet": something whose shape changes between frames — a character's
  pose, a flag, fire, an explosion. An image model draws all its poses at
  once as a sprite sheet.
  subject: a full visual description of it that is the same in every frame
  (what it is, colours, clothes, what it holds at the start). Do not describe
  the motion here.
  poses: exactly frameCount short descriptions, one per frame, of its pose
  in that frame, forming smooth motion; "" for frames where it is not seen
  (an explosion before it happens).
  box: one rectangle in tile pixels where it is drawn in every frame, large
  enough for all its poses (arms raised, legs apart), inside the tile.
  path: empty.
- kind "prop": something that keeps its shape and only moves — a thrown ball
  or grenade, a flying arrow, a falling leaf. It is drawn once and placed.
  subject: what it looks like.
  path: exactly frameCount boxes in tile pixels, one per frame, where it is
  in that frame; visible false where it is not seen (still held in a hand,
  already exploded). Follow a believable path (a throw is an arc) with even
  spacing, and keep its size unless it comes closer or goes away.
  box: its size in the first frame it is seen; poses: empty.
  copy: when it is already drawn as a separate object in OBJECTS, that
  object's number: its own pixels fly, nothing new is drawn. Otherwise -1.
  grab: when it is already drawn but not as a separate object (a skull held
  in a hand, touching it), the box in tile pixels around just that thing,
  tight, and reuse = the number of its layer in LAYERS: it is cut out into a
  layer of its own and its own pixels fly. Otherwise all zeros.
When a character holds something that flies off, that thing is always a
prop of its own (copy or grab), never part of the character's poses. Its
path gives its place in every frame: in the hand, moving with it, until it
is thrown, then along its flight. The character's poses show the hand
without it (holding nothing), as the thing is drawn by the prop.
Something never appears twice in a frame: in a sheet's pose and as a prop.
Example: "the necromancer throws the skull in his hand", with the skull drawn
in his hand on layer 0 "Necromancer" → two tracks: a sheet "Necromancer"
(reuse 0; poses: wind-up holding nothing, throw, follow-through) and a prop
"Skull" (grab: the tight box around the skull in his hand, reuse 0, copy -1;
path: in the hand for the wind-up, then forward along an arc).
reuse: when the request animates something already drawn (from LAYERS), that
layer's number, so its look is kept; otherwise -1. A sheet reuses the layer
it animates; a prop with grab names the layer the thing is cut from.

Never add a new thing for something already drawn: animate it (reuse) or
move its own pixels (copy or grab). Add tracks only for what the request asks to
move; no extra effects, trails or objects unless asked.

Keep everything inside the tile, where it fits the scene. Motion is smooth:
neighbouring frames differ a little. A looping action (walk, idle, waving)
ends where it can start again.

summary: one or two short sentences for the user, in the language of the
request, saying what the animation will show.`;

// ── Checks ─────────────────────────────────────────────────────────────────
// A finished edit or animation is looked at once (free text model) before it
// is applied; what is found is fixed once, and the fix is not checked again.

/** Most frames one check may have drawn again (paid, one picture each). */
export const MAX_REDRAWN_FRAMES = 2;

export const EDIT_REVIEW_RULES = `Picture 1 is a pixel art layer before an edit,
picture 2 the same area after it (enlarged; light grey means empty).
Judge only the edit: was REQUEST done, and did the art stay intact? Problems:
the request visibly not done; the art broken (holes, smeared or melted shapes,
lost outline, stray pixels, cut-off parts); things changed that the request did
not ask for; the subject changed far more than asked (another design, size or
palette).
ok: true when the result is acceptable, even if not perfect. Say false only for
a clear, visible problem; then problem is one short sentence for the user in
the language of REQUEST, and instruction is a better English instruction for
one more attempt that avoids it (what to change, and what to leave exactly as
it is). When ok, problem and instruction are "".`;

export const ANIMATION_REVIEW_RULES = `The picture shows every frame of a pixel
art animation side by side, frame 1 on the left, separated by dark lines
(enlarged; light grey means empty). Only what moves is shown. TRACKS lists what
was planned for each frame.
Check: the frames come in the right order for the motion; each frame shows the
thing once (never two of it, no missing or cut-off parts, no leftover
scraps); poses match the plan and flow smoothly; a prop moves along a
believable path (a throw is an arc, things fall down) and starts or stops at the
right moment (leaves the hand when it is thrown).
ok: true when it works, even if not perfect; then fixes is empty. Fix only
clear, visible problems; never change what works.
fixes: one per track that needs a fix; track is its number in TRACKS.
- order: for a sheet whose drawings are right but in the wrong frames, or has a
  broken frame that a neighbouring drawing can stand in for: one frame number
  per frame (frameCount numbers, counted from 1), saying whose drawing that
  frame shows. Frames where it is not seen keep their own number. Otherwise
  empty.
- redraw: for a sheet frame that is broken and no other drawing fits: the frame
  number and a short description of the pose it must show; at most
  ${MAX_REDRAWN_FRAMES} in all. Otherwise empty.
- path: for a prop moving wrongly: exactly frameCount boxes in tile pixels,
  visible false where it is not seen. Otherwise empty.
problem: one short sentence for the user in the language of REQUEST saying what
was fixed; "" when ok.`;
