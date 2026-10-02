import "server-only";
import {
  CHAT_PROMPT,
  GEMINI_BASE_URL,
  IMAGE_ATTEMPT_TIMEOUT_MS,
  IMAGE_RETRY_DELAYS_MS,
  ROUTER_PROMPT,
  SIZED_IMAGE_MODELS,
  SMALL_IMAGE_SIZE,
  TEXT_ATTEMPT_TIMEOUT_MS,
  TEXT_RETRY_DELAYS_MS,
  THINKING_LEVELS,
} from "../constants";
import { AiError, errorForStatus } from "../errors";
import { fetchWithin, tryModels } from "../fallback";
import {
  INTENTS,
  readAnimation,
  readEdit,
  readEditReview,
  readPlacement,
  readPlan,
  readRect,
  readRoute,
} from "../replies";
import type { AiProvider, ChatMessage, GeneratedImage } from "../types";
import { recordUsage, type GeminiUsage } from "../usage";

/** Google Gemini: the text models and the image models. */

type GeminiPart = {
  text?: string;
  inlineData?: { mimeType?: string; data?: string };
};
type GeminiResponse = {
  candidates?: { content?: { parts?: GeminiPart[] } }[];
  usageMetadata?: GeminiUsage;
};
type GeminiContent = {
  role: "user" | "model";
  parts: (
    { text: string } | { inlineData: { mimeType: string; data: string } }
  )[];
};

export function createGeminiProvider(
  apiKey: string,
  /** Models to try in order, for text and for pictures. */
  models: { text: string[]; image: string[] },
): AiProvider {
  /** Sends a request, moving on to the next model when one can't answer. */
  const request = (
    /** Names the request in the usage log, e.g. "route". */
    step: string,
    candidates: string[],
    /** The request, or one per model when models take different settings. */
    body: object | ((model: string) => object),
    { timeoutMs = TEXT_ATTEMPT_TIMEOUT_MS, delays = TEXT_RETRY_DELAYS_MS } = {},
  ) =>
    tryModels(
      candidates,
      async (model) => {
        const res = await fetchWithin(
          `${GEMINI_BASE_URL}/models/${model}:generateContent`,
          {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "x-goog-api-key": apiKey,
            },
            body: JSON.stringify(
              withThinking(
                model,
                typeof body === "function" ? body(model) : body,
              ),
            ),
          },
          timeoutMs,
        );
        if (!res.ok)
          throw errorForStatus("Gemini", res.status, await res.text());
        const data = (await res.json()) as GeminiResponse;
        await recordUsage(step, model, data.usageMetadata);
        return data.candidates?.[0]?.content?.parts ?? [];
      },
      delays,
    );

  /** A JSON answer to `prompt` about the pictures, shaped by `schema`. */
  const look = async (
    step: string,
    prompt: string,
    pictures: GeneratedImage | GeneratedImage[],
    schema: object,
  ) =>
    textOf(
      await request(step, models.text, {
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              ...[pictures].flat().map((p) => ({
                inlineData: { mimeType: p.mimeType, data: p.base64 },
              })),
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: schema,
        },
      }),
    );

  const draw = async (
    step: string,
    parts: GeminiContent["parts"],
    aspectRatio: string,
    small: boolean,
  ) =>
    firstImage(
      await request(
        step,
        models.image,
        (model) => ({
          contents: [{ role: "user", parts }],
          generationConfig: {
            imageConfig:
              small && SIZED_IMAGE_MODELS.some((m) => model.startsWith(m))
                ? { aspectRatio, imageSize: SMALL_IMAGE_SIZE }
                : { aspectRatio },
          },
        }),
        { timeoutMs: IMAGE_ATTEMPT_TIMEOUT_MS, delays: IMAGE_RETRY_DELAYS_MS },
      ),
    );

  return {
    async route(messages) {
      const parts = await request("route", models.text, {
        contents: toContents(messages),
        systemInstruction: { parts: [{ text: ROUTER_PROMPT }] },
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: object({
            intent: { type: "STRING", enum: [...INTENTS] },
            subject: STRING,
            where: STRING,
            count: INTEGER,
            name: STRING,
            frames: INTEGER,
            items: {
              type: "ARRAY",
              items: object({ subject: STRING, name: STRING }),
            },
          }),
        },
      });
      return readRoute(textOf(parts), messages.at(-1)?.content ?? "");
    },

    async chat(messages) {
      const parts = await request("chat", models.text, {
        contents: toContents(messages),
        systemInstruction: { parts: [{ text: CHAT_PROMPT }] },
      });
      return textOf(parts);
    },

    async edit(system, user) {
      const parts = await request("edit", models.text, {
        contents: [{ role: "user", parts: [{ text: user }] }],
        systemInstruction: { parts: [{ text: system }] },
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: object({
            summary: STRING,
            ops: { type: "ARRAY", items: STRING },
          }),
        },
      });
      return readEdit(textOf(parts));
    },

    generate: (prompt, aspectRatio, small = true, references = []) =>
      draw(
        "generate",
        [
          { text: prompt },
          ...references.map((p) => ({
            inlineData: { mimeType: p.mimeType, data: p.base64 },
          })),
        ],
        aspectRatio,
        small,
      ),

    redraw: (prompt, picture, aspectRatio, small = true) =>
      draw(
        "redraw",
        [
          { text: prompt },
          {
            inlineData: { mimeType: picture.mimeType, data: picture.base64 },
          },
        ],
        aspectRatio,
        small,
      ),

    async compose(prompt, tile) {
      return readRect(await look("compose", prompt, tile, RECT));
    },

    async place(prompt, tile) {
      const text = await look(
        "place",
        prompt,
        tile,
        object({
          copyOf: INTEGER,
          areas: { type: "ARRAY", items: RECT },
          ask: BOOLEAN,
          question: STRING,
        }),
      );
      return readPlacement(text);
    },

    async plan(prompt, tile) {
      const text = await look(
        "plan",
        prompt,
        tile,
        object({
          mode: { type: "STRING", enum: ["ops", "move", "redraw"] },
          objects: { type: "ARRAY", items: INTEGER },
          keep: { type: "ARRAY", items: INTEGER },
          target: RECT,
          instruction: STRING,
          summary: STRING,
          question: STRING,
        }),
      );
      return readPlan(text);
    },

    async animate(prompt, tile) {
      const text = await look(
        "animate",
        prompt,
        tile,
        object({
          name: STRING,
          frameCount: INTEGER,
          duration: INTEGER,
          summary: STRING,
          tracks: {
            type: "ARRAY",
            items: object({
              name: STRING,
              subject: STRING,
              reuse: INTEGER,
              box: RECT,
              poses: { type: "ARRAY", items: STRING },
            }),
          },
        }),
      );
      return readAnimation(text);
    },

    async reviewEdit(prompt, before, after) {
      const text = await look(
        "reviewEdit",
        prompt,
        [before, after],
        object({ ok: BOOLEAN, problem: STRING, instruction: STRING }),
      );
      return readEditReview(text);
    },
  };
}

// Gemini's schema format: upper-case types, every listed property required.
const STRING = { type: "STRING" };
const INTEGER = { type: "INTEGER" };
const BOOLEAN = { type: "BOOLEAN" };
const object = <P extends Record<string, object>>(properties: P) => ({
  type: "OBJECT",
  properties,
  required: Object.keys(properties),
});
const RECT = object({ x: INTEGER, y: INTEGER, w: INTEGER, h: INTEGER });

/** `body` with the model's thinking level from THINKING_LEVELS, if it has one. */
function withThinking(model: string, body: { generationConfig?: object }) {
  const thinkingLevel = THINKING_LEVELS[model];
  if (!thinkingLevel) return body;
  return {
    ...body,
    generationConfig: {
      ...body.generationConfig,
      thinkingConfig: { thinkingLevel },
    },
  };
}

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
