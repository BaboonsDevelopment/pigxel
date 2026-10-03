import { MAX_SET_ITEMS } from "./constants";
import { AiError } from "./errors";
import type {
  AnimationReply,
  EditReply,
  EditReview,
  PlacementReply,
  PlanReply,
  Rect,
  Route,
} from "./types";

export const INTENTS = ["generate", "edit", "animate", "undo", "chat"] as const;

const MAX_COUNT = 12;

function parseJson<T>(text: string): Partial<T> | null {
  try {
    return JSON.parse(text) as Partial<T>;
  } catch {
    return null;
  }
}

const unusable = (what: string) =>
  new AiError("failed", `The model sent no usable ${what}.`);

export function readRoute(text: string, latest: string): Route {
  const route = parseJson<Route>(text);
  const intent = INTENTS.find((i) => i === route?.intent);
  if (!intent)
    return {
      intent: "chat",
      subject: "",
      where: "",
      count: 1,
      name: "",
      frames: 0,
      items: [],
    };
  const count = Math.round(Number(route?.count));
  const frames = Math.round(Number(route?.frames));
  return {
    intent,
    subject: route?.subject || latest,
    where: route?.where ?? "",
    count: count >= 1 ? Math.min(count, MAX_COUNT) : 1,
    name: (route?.name ?? "").trim().slice(0, 40),
    frames: frames >= 1 ? frames : 0,
    items: (Array.isArray(route?.items) ? route.items : [])
      .map((item) => ({
        subject: String(item?.subject ?? "")
          .trim()
          .slice(0, 300),
        name: String(item?.name ?? "")
          .trim()
          .slice(0, 40),
      }))
      .filter((item) => item.subject)
      .slice(0, MAX_SET_ITEMS),
  };
}

export function readPlacement(text: string): PlacementReply {
  const reply = parseJson<PlacementReply>(text);
  if (!reply || !Array.isArray(reply.areas)) throw unusable("placement");
  return {
    copyOf: Number.isInteger(reply.copyOf) ? reply.copyOf! : -1,
    areas: reply.areas,
    ask: reply.ask === true,
    question: reply.question ?? "",
  };
}

export function readEdit(text: string): EditReply {
  const reply = parseJson<EditReply>(text);
  if (!Array.isArray(reply?.ops)) throw unusable("edit");
  return {
    summary: reply.summary ?? "",
    ops: reply.ops.filter((o) => typeof o === "string"),
  };
}

export function readRect(text: string): Rect {
  const { x, y, w, h } = parseJson<Rect>(text) ?? {};
  if (x === undefined || y === undefined || !w || !h) throw unusable("area");
  return { x, y, w, h };
}

export function readPlan(text: string): PlanReply {
  const reply = parseJson<PlanReply>(text);
  if (!reply?.instruction || !reply.target) throw unusable("plan");
  return {
    mode: reply.mode === "ops" || reply.mode === "move" ? reply.mode : "redraw",
    objects: (reply.objects ?? []).filter(Number.isInteger),
    keep: (reply.keep ?? []).filter(Number.isInteger),
    target: reply.target,
    instruction: reply.instruction,
    summary: reply.summary ?? "",
    question: reply.question ?? "",
  };
}

export function readEditReview(text: string): EditReview {
  const reply = parseJson<EditReview>(text);
  const instruction = String(reply?.instruction ?? "").trim();
  return {
    ok: reply?.ok !== false || !instruction,
    problem: String(reply?.problem ?? ""),
    instruction,
  };
}

export function readAnimation(text: string): AnimationReply {
  const reply = parseJson<AnimationReply>(text);
  if (!reply || !Array.isArray(reply.tracks)) throw unusable("animation plan");
  return reply as AnimationReply;
}
