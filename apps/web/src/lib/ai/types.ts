/** Something the user asked the AI to do to the tile, rather than just talk. */
export type TileAction = {
  kind: "generate" | "edit";
  /** For generate: a clean subject description; otherwise the user's words. */
  request: string;
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  action?: TileAction;
};

/** What a server action returns; errors are already readable for the user. */
export type AiResult<T> = { ok: true; value: T } | { ok: false; error: string };

export type Intent = TileAction["kind"] | "chat";

/** `subject` is a clean description of what to draw, set when generating. */
export type Route = { intent: Intent; subject: string };

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
  /** Objects inside `source` that must stay exactly as they are. */
  keep: Rect[];
  /** A clear English instruction for the model that does the edit. */
  instruction: string;
  /** One short sentence for the user, in their language. */
  summary: string;
};

/** The planner's raw answer; `objects` index the objects it was shown. */
export type PlanReply = {
  mode: EditPlan["mode"];
  objects: number[];
  keep: number[];
  target: Rect;
  instruction: string;
  summary: string;
};

export interface AiProvider {
  /** Decides what the user wants. Free text model. */
  route(messages: ChatMessage[]): Promise<Route>;
  /** Plain conversation. Free text model. */
  chat(messages: ChatMessage[]): Promise<string>;
  /** Precise edit: reads the tile grid, answers with operations. Free text model. */
  edit(system: string, user: string): Promise<EditReply>;
  /** Draws a new picture. Paid image model. */
  generate(prompt: string, aspectRatio: string): Promise<GeneratedImage>;
  /** Changes a picture of an area. Paid image model. */
  redraw(
    prompt: string,
    picture: GeneratedImage,
    aspectRatio: string,
  ): Promise<GeneratedImage>;
  /** Looks at the tile and picks where a new subject fits the scene. Free model. */
  compose(prompt: string, tile: GeneratedImage): Promise<Rect>;
  /** Looks at the tile and decides how to carry out an edit. Free model. */
  plan(prompt: string, tile: GeneratedImage): Promise<PlanReply>;
}
