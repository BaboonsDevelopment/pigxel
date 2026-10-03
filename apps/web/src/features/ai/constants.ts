import { CHROMA_KEY_HEX } from "@/lib/image/constants";

export const TEXT_RETRY_DELAYS_MS = [1_000, 2_000, 4_000];
export const IMAGE_RETRY_DELAYS_MS = [2_000];
export const TEXT_ATTEMPT_TIMEOUT_MS = 20_000;
export const IMAGE_ATTEMPT_TIMEOUT_MS = 40_000;

export const GEMINI_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta";
export const THINKING_LEVELS: Record<string, string> = {
  "gemini-3.7-flash": "low",
  "gemini-3.6-flash": "minimal",
};

export const TEXT_MODELS = [
  "gemini-3.6-flash",
  "gemini-3.7-flash",
  "gemini-3.1-flash-lite",
];
export const IMAGE_MODELS = [
  "gemini-3.1-flash-lite-image",
  "gemini-2.5-flash-image",
  "gemini-3.1-flash-image",
];
export const SIZED_IMAGE_MODELS = ["gemini-3.1-flash-image"];
export const SMALL_IMAGE_SIZE = "512";
export const SMALL_IMAGE_MAX_SIDE = 64;

export const MAX_HISTORY = 12;
export const PLACEMENT_HISTORY = 6;

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
- items: when they ask for several DIFFERENT things at once ("a dog, an
  apple and a pitchfork"), one entry per thing, in their order: subject (a
  short plain English description of that one thing, as above) and name (its
  layer name, as above). Then subject lists them all briefly, count is 1 and
  where is empty. For one thing, or several of the same thing (that is
  count), items is empty.
For animate also set frames: the number of frames they asked for, 0 when
they did not say.
Otherwise leave where and name empty, items empty, count 1 and frames 0.
A message ending in ${REFERENCES_NOTE} came with pictures to draw from
("draw this", "in this style", "make him like this"): drawing something from
them is generate, and subject says what to take from them ("the fox from the
reference picture", "a knight in the style of the reference picture").`;

export const CHAT_PROMPT =
  "You are the assistant of Pigxel, a pixel art editor. Answer briefly in plain " +
  "text, in the user's language. Never write JSON or pretend to call tools.";

export const IMAGE_BACKGROUND_RULES = [
  `The background is one solid flat ${CHROMA_KEY_HEX} magenta colour — no gradient, no pattern, no checkerboard.`,
  `The subject itself contains no ${CHROMA_KEY_HEX} magenta.`,
  "Nothing is behind the subject: no backdrop, no scenery, no ground, no platform,",
  "no shadow cast behind or beneath it, no vignette.",
  "No text, no watermark, no border, no extra objects.",
];

export const REFERENCE_RULES =
  "Use the attached picture(s) as reference for what the subject looks like " +
  "(design, shapes, colours, proportions), redrawn in the pixel art style " +
  "below; copy nothing else from them (no background, no text).";

export const IMAGE_STYLE_RULES = [
  "crisp hard-edged pixels, no anti-aliasing, no blur.",
  "Polished fantasy game sprite in the style of classic 16-bit and 32-bit RPGs: natural proportions and a clear, readable silhouette; not cartoonish, not chibi, not a vector or flat illustration.",
  "Rich hand-placed shading with hue-shifted shadows and highlights, texture on materials (cloth, metal, fur, stone), one clear light source from the top left.",
  "Muted, atmospheric palette with a few strong accent colours, dark outline.",
  "The subject is complete — nothing cropped by the edges.",
  ...IMAGE_BACKGROUND_RULES,
];

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

export const MAX_SET_ITEMS = 6;

export const MAX_FRAMES = 12;

export const ANIMATION_RULES = `Plan a short pixel art animation for the request.

frameCount: how many frames, 4 to 8 for most actions (more for a long or slow
one), at most ${MAX_FRAMES}; use FRAMES when given.
duration: how long each frame shows, in milliseconds: about 100 for most
actions, 60-80 for fast ones, 150-250 for slow ones.
name: a short Title Case name for the animation ("Monkey Throws Grenade").

tracks: exactly one track: the whole animation is ONE layer, drawn frame by
frame as one sprite sheet (one picture). It shows everything that moves in
the request together — the character and whatever it throws, shoots, casts or
makes happen (a frost bolt, a thrown grenade, sparks, an explosion) — drawn
in the frames where they are, never as separate things.
- name: a short Title Case name for the layer.
- subject: a full visual description of everything the animation shows that
  stays the same in every frame (the character: what it is, colours, clothes,
  what it holds; and what its spell or projectile looks like). Do not
  describe the motion here.
- poses: exactly frameCount short descriptions, one per frame, of the whole
  scene in that frame: the character's pose and where everything else is
  ("the mage raises the staff, a small frost bolt forms at its tip"; "the
  bolt halfway to the right edge, the mage lowering the staff"). Moving
  things follow a believable path with even spacing.
- box: one rectangle in tile pixels that holds the whole action in every
  frame (the character and the full path of what it throws or casts), inside
  the tile. Every frame is drawn into this same box, as by a fixed camera.
- reuse: when the request animates something already drawn (from LAYERS),
  that layer's number, so its look is kept and it is replaced by the
  animation; otherwise -1. A thing already drawn on that layer that moves (a
  skull in his hand that he throws) is part of the frames too.

Never add a new thing for something already drawn: animate it (reuse). Show
only what the request asks for; no extra effects, trails or objects unless
asked.

Keep everything inside the tile, where it fits the scene. Motion is smooth:
neighbouring frames differ a little. A looping action (walk, idle, waving)
ends where it can start again.

summary: one or two short sentences for the user, in the language of the
request, saying what the animation will show.`;

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
