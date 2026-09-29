import "server-only";
import {
  GEMINI_BASE_URL,
  IMAGE_ATTEMPT_TIMEOUT_MS,
  IMAGE_RETRY_DELAYS_MS,
  CHAT_PROMPT,
  ROUTER_PROMPT,
  TEXT_ATTEMPT_TIMEOUT_MS,
  TEXT_RETRY_DELAYS_MS,
} from "../constants";
import { AiError, errorForStatus } from "../errors";
import type {
  AiProvider,
  ChatMessage,
  EditReply,
  GeneratedImage,
  PlacementReply,
  PlanReply,
  Rect,
  Route,
} from "../types";

type GeminiPart = {
  text?: string;
  inlineData?: { mimeType?: string; data?: string };
};
type GeminiResponse = { candidates?: { content?: { parts?: GeminiPart[] } }[] };
type GeminiContent = {
  role: "user" | "model";
  parts: (
    { text: string } | { inlineData: { mimeType: string; data: string } }
  )[];
};

export function createGeminiProvider(
  apiKey: string,
  /** Models to try in order, for text and for pictures. */
  models: { edit: string[]; generate: string[] },
): AiProvider {
  const attempt = async (
    model: string,
    body: object,
    timeoutMs: number,
  ): Promise<GeminiPart[]> => {
    let res: Response;
    try {
      res = await fetch(`${GEMINI_BASE_URL}/models/${model}:generateContent`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (e) {
      const timedOut = e instanceof Error && e.name === "TimeoutError";
      throw new AiError(timedOut ? "timeout" : "failed", String(e));
    }
    if (!res.ok) throw errorForStatus(res.status, await res.text());
    const data = (await res.json()) as GeminiResponse;
    return data.candidates?.[0]?.content?.parts ?? [];
  };

  /**
   * Sends a request, moving on to the next model when one is busy or too
   * slow, and pausing between rounds when all of them are.
   */
  const request = async (
    candidates: string[],
    contents: GeminiContent[],
    options: object = {},
    { timeoutMs = TEXT_ATTEMPT_TIMEOUT_MS, delays = TEXT_RETRY_DELAYS_MS } = {},
  ) => {
    for (let round = 0; ; round++) {
      let last: unknown;
      for (const model of candidates) {
        try {
          return await attempt(model, { contents, ...options }, timeoutMs);
        } catch (e) {
          if (!isRetryable(e)) throw e;
          console.warn(`[ai] ${model} unavailable, trying the next one`);
          last = e;
        }
      }
      const delay = delays[round];
      if (delay === undefined) throw last;
      await sleep(delay);
    }
  };

  return {
    async route(messages) {
      const parts = await request(models.edit, toContents(messages), {
        systemInstruction: { parts: [{ text: ROUTER_PROMPT }] },
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              intent: { type: "STRING", enum: [...INTENTS] },
              subject: { type: "STRING" },
              where: { type: "STRING" },
              count: { type: "INTEGER" },
            },
            required: ["intent", "subject", "where", "count"],
          },
        },
      });
      const route = parseJson<Route>(textOf(parts));
      const intent = INTENTS.find((i) => i === route?.intent);
      // Anything unexpected becomes plain chat: free, and changes nothing.
      if (!intent) return { intent: "chat", subject: "", where: "", count: 1 };
      const latest = messages.at(-1)?.content ?? "";
      const count = Math.round(Number(route?.count));
      return {
        intent,
        subject: route?.subject || latest,
        where: route?.where ?? "",
        count: count >= 1 ? Math.min(count, MAX_COUNT) : 1,
      };
    },

    async place(prompt, tile) {
      const parts = await request(
        models.edit,
        [
          {
            role: "user",
            parts: [
              { text: prompt },
              { inlineData: { mimeType: tile.mimeType, data: tile.base64 } },
            ],
          },
        ],
        {
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                copyOf: { type: "INTEGER" },
                areas: { type: "ARRAY", items: RECT_SCHEMA },
                ask: { type: "BOOLEAN" },
                question: { type: "STRING" },
              },
              required: ["copyOf", "areas", "ask", "question"],
            },
          },
        },
      );
      const reply = parseJson<PlacementReply>(textOf(parts));
      if (!reply || !Array.isArray(reply.areas)) {
        throw new AiError("failed", "Gemini sent no usable placement.");
      }
      return {
        copyOf: Number.isInteger(reply.copyOf) ? reply.copyOf! : -1,
        areas: reply.areas,
        ask: reply.ask === true,
        question: reply.question ?? "",
      };
    },

    async chat(messages) {
      const parts = await request(models.edit, toContents(messages), {
        systemInstruction: { parts: [{ text: CHAT_PROMPT }] },
      });
      return textOf(parts);
    },

    async edit(system, user) {
      const parts = await request(
        models.edit,
        [{ role: "user", parts: [{ text: user }] }],
        {
          systemInstruction: { parts: [{ text: system }] },
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                summary: { type: "STRING" },
                ops: { type: "ARRAY", items: { type: "STRING" } },
              },
              required: ["summary", "ops"],
            },
          },
        },
      );
      const reply = parseJson<EditReply>(textOf(parts));
      if (!Array.isArray(reply?.ops)) {
        throw new AiError("failed", "Gemini sent no usable edit.");
      }
      return {
        summary: reply.summary ?? "",
        ops: reply.ops.filter((o) => typeof o === "string"),
      };
    },

    async generate(prompt, aspectRatio) {
      const parts = await request(
        models.generate,
        [{ role: "user", parts: [{ text: prompt }] }],
        { generationConfig: { imageConfig: { aspectRatio } } },
        { timeoutMs: IMAGE_ATTEMPT_TIMEOUT_MS, delays: IMAGE_RETRY_DELAYS_MS },
      );
      return firstImage(parts);
    },

    async redraw(prompt, picture, aspectRatio) {
      const parts = await request(
        models.generate,
        [
          {
            role: "user",
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: picture.mimeType,
                  data: picture.base64,
                },
              },
            ],
          },
        ],
        { generationConfig: { imageConfig: { aspectRatio } } },
        { timeoutMs: IMAGE_ATTEMPT_TIMEOUT_MS, delays: IMAGE_RETRY_DELAYS_MS },
      );
      return firstImage(parts);
    },

    async compose(prompt, tile) {
      const parts = await request(
        models.edit,
        [
          {
            role: "user",
            parts: [
              { text: prompt },
              { inlineData: { mimeType: tile.mimeType, data: tile.base64 } },
            ],
          },
        ],
        {
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                x: { type: "INTEGER" },
                y: { type: "INTEGER" },
                w: { type: "INTEGER" },
                h: { type: "INTEGER" },
              },
              required: ["x", "y", "w", "h"],
            },
          },
        },
      );
      const rect = parseJson<Rect>(textOf(parts));
      const { x, y, w, h } = rect ?? {};
      if (x === undefined || y === undefined || !w || !h) {
        throw new AiError("failed", "Gemini sent no usable area.");
      }
      return { x, y, w, h };
    },

    async plan(prompt, tile) {
      const rect = {
        type: "OBJECT",
        properties: {
          x: { type: "INTEGER" },
          y: { type: "INTEGER" },
          w: { type: "INTEGER" },
          h: { type: "INTEGER" },
        },
        required: ["x", "y", "w", "h"],
      };
      const parts = await request(
        models.edit,
        [
          {
            role: "user",
            parts: [
              { text: prompt },
              { inlineData: { mimeType: tile.mimeType, data: tile.base64 } },
            ],
          },
        ],
        {
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                mode: { type: "STRING", enum: ["ops", "move", "redraw"] },
                objects: { type: "ARRAY", items: { type: "INTEGER" } },
                keep: { type: "ARRAY", items: { type: "INTEGER" } },
                target: rect,
                instruction: { type: "STRING" },
                summary: { type: "STRING" },
                question: { type: "STRING" },
              },
              required: [
                "mode",
                "objects",
                "keep",
                "target",
                "instruction",
                "summary",
                "question",
              ],
            },
          },
        },
      );
      const reply = parseJson<PlanReply>(textOf(parts));
      if (!reply?.instruction || !reply.target) {
        throw new AiError("failed", "Gemini sent no usable plan.");
      }
      return {
        mode:
          reply.mode === "ops" || reply.mode === "move" ? reply.mode : "redraw",
        objects: (reply.objects ?? []).filter(Number.isInteger),
        keep: (reply.keep ?? []).filter(Number.isInteger),
        target: reply.target,
        instruction: reply.instruction,
        summary: reply.summary ?? "",
        question: reply.question ?? "",
      };
    },
  };
}

function isRetryable(e: unknown): boolean {
  return (
    e instanceof AiError &&
    (e.code === "overloaded" ||
      e.code === "rate_limited" ||
      e.code === "timeout")
  );
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function parseJson<T>(text: string): Partial<T> | null {
  try {
    return JSON.parse(text) as Partial<T>;
  } catch {
    return null;
  }
}

const INTENTS = ["generate", "edit", "chat"] as const;

const textOf = (parts: GeminiPart[]) => parts.map((p) => p.text ?? "").join("");

function firstImage(parts: GeminiPart[]): GeneratedImage {
  const image = parts.find((p) => p.inlineData?.data)?.inlineData;
  if (!image?.data) throw new AiError("failed", "Gemini returned no image.");
  return { mimeType: image.mimeType ?? "image/png", base64: image.data };
}

/** A conversation in Gemini's shape: the model's turns are called "model". */
const toContents = (messages: ChatMessage[]): GeminiContent[] =>
  messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

/** Most pictures one request may add at once. */
const MAX_COUNT = 12;

const RECT_SCHEMA = {
  type: "OBJECT",
  properties: {
    x: { type: "INTEGER" },
    y: { type: "INTEGER" },
    w: { type: "INTEGER" },
    h: { type: "INTEGER" },
  },
  required: ["x", "y", "w", "h"],
};
