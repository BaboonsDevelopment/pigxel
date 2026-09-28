export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  /** Set when the user asked for a new picture of `subject`. */
  create?: { subject: string };
};

/** What a server action returns; errors are already readable for the user. */
export type AiResult<T> = { ok: true; value: T } | { ok: false; error: string };

export type Intent = "generate" | "edit";

/** `subject` is a clean description of what to draw, set when generating. */
export type Route = { intent: Intent; subject: string };

export type GeneratedImage = { mimeType: string; base64: string };

/** A rectangle of tile pixels. */
export type Rect = { x: number; y: number; w: number; h: number };

export interface AiProvider {
  /** Decides what the user wants. Uses the free text model. */
  route(message: string): Promise<Route>;
  /** Edit mode: works on the existing tile. Uses the free text model. */
  edit(messages: ChatMessage[]): Promise<string>;
  /** Generate mode: draws a new picture. Uses the paid image model. */
  generate(prompt: string, aspectRatio: string): Promise<GeneratedImage>;
  /** Looks at the tile and picks where a new subject fits the scene. Free model. */
  compose(prompt: string, tile: GeneratedImage): Promise<Rect>;
}
