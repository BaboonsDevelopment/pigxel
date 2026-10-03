export type TileAction = {
  kind: "generate" | "edit" | "animate" | "undo";
  request: string;
  where?: string;
  count?: number;
  name?: string;
  frames?: number;
  items?: SetItem[];
};

export type SetItem = { subject: string; name: string };

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  action?: TileAction;
};

export type AiResult<T> = { ok: true; value: T } | { ok: false; error: string };

type Intent = TileAction["kind"] | "chat";

export type Route = {
  intent: Intent;
  subject: string;
  where: string;
  count: number;
  name: string;
  frames: number;
  items: SetItem[];
};

export type GeneratedImage = { mimeType: string; base64: string };

export type Rect = { x: number; y: number; w: number; h: number };

export type EditReply = { summary: string; ops: string[] };

export type EditPlan = {
  mode: "ops" | "move" | "redraw";
  source: Rect;
  target: Rect;
  objects: number[];
  keep: Rect[];
  instruction: string;
  summary: string;
  question: string;
};

export type PlanReply = {
  mode: EditPlan["mode"];
  objects: number[];
  keep: number[];
  target: Rect;
  instruction: string;
  summary: string;
  question: string;
};

export type PlacementPlan = {
  copyOf: number | null;
  areas: Rect[];
  ask: boolean;
  question: string;
};

export type PlacementReply = {
  copyOf: number;
  areas: Rect[];
  ask: boolean;
  question: string;
};

export type SheetTrack = {
  name: string;
  subject: string;
  reuse: number | null;
  box: Rect;
  poses: string[];
};

export type AnimationPlan = {
  name: string;
  frameCount: number;
  duration: number;
  tracks: SheetTrack[];
  summary: string;
};

export type EditReview = { ok: boolean; problem: string; instruction: string };

export type AnimationReply = {
  name: string;
  frameCount: number;
  duration: number;
  summary: string;
  tracks: {
    name: string;
    subject: string;
    reuse: number;
    box: Rect;
    poses: string[];
  }[];
};

export interface AiProvider {
  route(messages: ChatMessage[]): Promise<Route>;
  chat(messages: ChatMessage[]): Promise<string>;
  edit(system: string, user: string): Promise<EditReply>;
  generate(
    prompt: string,
    aspectRatio: string,
    small?: boolean,
    references?: GeneratedImage[],
  ): Promise<GeneratedImage>;
  redraw(
    prompt: string,
    picture: GeneratedImage,
    aspectRatio: string,
    small?: boolean,
  ): Promise<GeneratedImage>;
  compose(prompt: string, tile: GeneratedImage): Promise<Rect>;
  place(prompt: string, tile: GeneratedImage): Promise<PlacementReply>;
  plan(prompt: string, tile: GeneratedImage): Promise<PlanReply>;
  animate(prompt: string, tile: GeneratedImage): Promise<AnimationReply>;
  reviewEdit(
    prompt: string,
    before: GeneratedImage,
    after: GeneratedImage,
  ): Promise<EditReview>;
}
