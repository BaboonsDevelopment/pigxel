import "server-only";
import {
  GEMINI_BASE_URL,
  IMAGE_ATTEMPT_TIMEOUT_MS,
  IMAGE_RETRY_DELAYS_MS,
  ROUTER_PROMPT,
  TEXT_ATTEMPT_TIMEOUT_MS,
  TEXT_RETRY_DELAYS_MS,
} from "../constants";
import { AiError, errorForStatus } from "../errors";
import type { AiProvider, Rect, Route } from "../types";

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
    async route(message) {
      const parts = await request(
        models.edit,
        [{ role: "user", parts: [{ text: message }] }],
        {
          systemInstruction: { parts: [{ text: ROUTER_PROMPT }] },
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                intent: { type: "STRING", enum: ["generate", "edit"] },
                subject: { type: "STRING" },
              },
              required: ["intent", "subject"],
            },
          },
        },
      );
      const route = parseJson<Route>(parts.map((p) => p.text ?? "").join(""));
      // Anything unexpected falls back to the free edit mode.
      return route?.intent === "generate"
        ? { intent: "generate", subject: route.subject || message }
        : { intent: "edit", subject: "" };
    },

    async edit(messages) {
      const parts = await request(
        models.edit,
        messages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
      );
      return parts.map((p) => p.text ?? "").join("");
    },

    async generate(prompt, aspectRatio) {
      const parts = await request(
        models.generate,
        [{ role: "user", parts: [{ text: prompt }] }],
        { generationConfig: { imageConfig: { aspectRatio } } },
        { timeoutMs: IMAGE_ATTEMPT_TIMEOUT_MS, delays: IMAGE_RETRY_DELAYS_MS },
      );
      const image = parts.find((p) => p.inlineData?.data)?.inlineData;
      if (!image?.data)
        throw new AiError("failed", "Gemini returned no image.");
      return { mimeType: image.mimeType ?? "image/png", base64: image.data };
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
      const rect = parseJson<Rect>(parts.map((p) => p.text ?? "").join(""));
      const { x, y, w, h } = rect ?? {};
      if (x === undefined || y === undefined || !w || !h) {
        throw new AiError("failed", "Gemini sent no usable area.");
      }
      return { x, y, w, h };
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
