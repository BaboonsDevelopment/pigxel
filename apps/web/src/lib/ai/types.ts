/** Something the user asked the AI to do to the tile, rather than just talk. */
export type TileAction = {
  kind: "generate" | "edit" | "animate" | "undo";
  /**
   * For generate: a clean subject description; for animate: what happens;
   * for edit: the user's words.
   */
  request: string;
  /** For generate: where the user wants it, in their words; "" when unsaid. */
  where?: string;
  /** For generate: how many to add. */
  count?: number;
  /** For generate: a short name for the layer it goes on, e.g. "Monkey". */
  name?: string;
  /** For animate: how many frames were asked for; 0 lets the planner choose. */
  frames?: number;
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  action?: TileAction;
};

/** What a server action returns; errors are already readable for the user. */
export type AiResult<T> = { ok: true; value: T } | { ok: false; error: string };

type Intent = TileAction["kind"] | "chat";

/**
 * `subject` is what to draw (generate), what happens (animate) or the full
 * request (edit); `where`, `count` and `name` are for generate, `frames` for
 * animate.
 */
export type Route = {
  intent: Intent;
  subject: string;
  where: string;
  count: number;
  name: string;
  frames: number;
};

export type GeneratedImage = { mimeType: string; base64: string };

/** A rectangle of tile pixels. */
export type Rect = { x: number; y: number; w: number; h: number };

/** The operations a precise edit came back with (see lib/edit/ops.ts). */
export type EditReply = { summary: string; ops: string[] };

/**
 * How an edit is carried out. `source` is what gets changed, `target` where
 * the result goes: the same box for an in-place change, another box to move
 * or resize. "ops" edits pixels precisely and "move" copies them exactly
 * (both free); "redraw" has the image model paint the result (paid).
 */
export type EditPlan = {
  mode: "ops" | "move" | "redraw";
  source: Rect;
  target: Rect;
  /** Indexes of the objects that change, in the list the planner was given. */
  objects: number[];
  /** Objects inside `source` that must stay exactly as they are. */
  keep: Rect[];
  /** A clear English instruction for the model that does the edit. */
  instruction: string;
  /** One short sentence for the user, in their language. */
  summary: string;
  /** Asks the user, in their language, to check the frame of a move or resize. */
  question: string;
};

/** The planner's raw answer; `objects` index the objects it was shown. */
export type PlanReply = {
  mode: EditPlan["mode"];
  objects: number[];
  keep: number[];
  target: Rect;
  instruction: string;
  summary: string;
  question: string;
};

/**
 * Where new pictures go on a tile that already has drawings. `copyOf`, when
 * set, is the index of an object to duplicate instead of generating; `ask`
 * means no spot works without covering something, so the user should choose.
 */
export type PlacementPlan = {
  copyOf: number | null;
  areas: Rect[];
  ask: boolean;
  question: string;
};

/** The placement planner's raw answer; `copyOf` indexes the objects shown. */
export type PlacementReply = {
  copyOf: number;
  areas: Rect[];
  ask: boolean;
  question: string;
};

/**
 * Something that changes shape from frame to frame (a character's pose, an
 * explosion): the image model draws all its poses at once, as a sprite sheet.
 * `poses` has one entry per frame, "" where it is not seen.
 */
export type SheetTrack = {
  kind: "sheet";
  name: string;
  subject: string;
  /** The index of an existing layer it animates (its look is kept), or null. */
  reuse: number | null;
  /** Where it is drawn in every frame, in tile pixels. */
  box: Rect;
  poses: string[];
};

/**
 * Something that keeps its shape and only moves (a thrown grenade): drawn
 * once, then placed at `path[frame]`, or hidden where that is null.
 */
export type PropTrack = {
  kind: "prop";
  name: string;
  subject: string;
  /**
   * The number of an object already drawn on the tile (from the objects the
   * planner was shown) whose own pixels fly; nothing new is drawn.
   */
  copy: number | null;
  /**
   * A thing drawn as part of a layer (a skull held in a hand): the box
   * around it and the layer's number (null when the planner didn't say; the
   * layer drawn there is used). It is cut out into a layer of its own first,
   * and its pixels fly.
   */
  grab: { layer: number | null; area: Rect } | null;
  path: (Rect | null)[];
};

export type AnimationTrack = SheetTrack | PropTrack;

/** How an animation is made: its frames and one layer per track, bottom to top. */
export type AnimationPlan = {
  /** A short name for the group of new layers, e.g. "Monkey throws grenade". */
  name: string;
  frameCount: number;
  /** How long each frame shows, in milliseconds. */
  duration: number;
  tracks: AnimationTrack[];
  /** One or two sentences for the user, in their language. */
  summary: string;
};

/** The animation planner's raw answer: tracks in one flat shape. */
export type AnimationReply = {
  name: string;
  frameCount: number;
  duration: number;
  summary: string;
  tracks: {
    kind: string;
    name: string;
    subject: string;
    reuse: number;
    box: Rect;
    copy: number;
    grab: Rect;
    poses: string[];
    path: (Rect & { visible: boolean })[];
  }[];
};

export interface AiProvider {
  /** Decides what the user wants. Text model. */
  route(messages: ChatMessage[]): Promise<Route>;
  /** Plain conversation. Text model. */
  chat(messages: ChatMessage[]): Promise<string>;
  /** Precise edit: reads the tile grid, answers with operations. Text model. */
  edit(system: string, user: string): Promise<EditReply>;
  /** Draws a new picture. Image model (paid). */
  generate(prompt: string, aspectRatio: string): Promise<GeneratedImage>;
  /** Changes a picture of an area. Image model (paid). */
  redraw(
    prompt: string,
    picture: GeneratedImage,
    aspectRatio: string,
  ): Promise<GeneratedImage>;
  /** Looks at the tile and picks where a new subject fits the scene. Text model. */
  compose(prompt: string, tile: GeneratedImage): Promise<Rect>;
  /** Looks at the tile and decides where new pictures go. Text model. */
  place(prompt: string, tile: GeneratedImage): Promise<PlacementReply>;
  /** Looks at the tile and decides how to carry out an edit. Text model. */
  plan(prompt: string, tile: GeneratedImage): Promise<PlanReply>;
  /** Looks at the tile and plans an animation. Text model. */
  animate(prompt: string, tile: GeneratedImage): Promise<AnimationReply>;
}
