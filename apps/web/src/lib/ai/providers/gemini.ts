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
} from "../constants";
import { AiError, errorForStatus } from "../errors";
import { fetchWithin, tryModels } from "../fallback";
import {
  INTENTS,
  readAnimation,
  readEdit,
  readPlacement,
  readPlan,
  readRect,
  readRoute,
} from "../replies";
import type { AiProvider, ChatMessage, GeneratedImage } from "../types";

/** Google Gemini: the text models and the image models. */

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
  models: { text: string[]; image: string[] },
): AiProvider {
  /** Sends a request, moving on to the next model when one can't answer. */
  const request = (
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
              typeof body === "function" ? body(model) : body,
            ),
          },
          timeoutMs,
        );
        if (!res.ok)
          throw errorForStatus("Gemini", res.status, await res.text());
        const data = (await res.json()) as GeminiResponse;
        return data.candidates?.[0]?.content?.parts ?? [];
      },
      delays,
    );

  /** A JSON answer to `prompt` about the picture `tile`, shaped by `schema`. */
  const look = async (prompt: string, tile: GeneratedImage, schema: object) =>
    textOf(
      await request(models.text, {
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              { inlineData: { mimeType: tile.mimeType, data: tile.base64 } },
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
    parts: GeminiContent["parts"],
    aspectRatio: string,
    small: boolean,
  ) =>
    firstImage(
      await request(
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
      const parts = await request(models.text, {
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
          }),
        },
      });
      return readRoute(textOf(parts), messages.at(-1)?.content ?? "");
    },

    async chat(messages) {
      const parts = await request(models.text, {
        contents: toContents(messages),
        systemInstruction: { parts: [{ text: CHAT_PROMPT }] },
      });
      return textOf(parts);
    },

    async edit(system, user) {
      const parts = await request(models.text, {
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

    generate: (prompt, aspectRatio, small = true) =>
      draw([{ text: prompt }], aspectRatio, small),

    redraw: (prompt, picture, aspectRatio, small = true) =>
      draw(
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
      return readRect(await look(prompt, tile, RECT));
    },

    async place(prompt, tile) {
      const text = await look(
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
              kind: { type: "STRING", enum: ["sheet", "prop"] },
              name: STRING,
              subject: STRING,
              reuse: INTEGER,
              box: RECT,
              copy: INTEGER,
              grab: RECT,
              poses: { type: "ARRAY", items: STRING },
              path: {
                type: "ARRAY",
                items: object({ ...RECT.properties, visible: BOOLEAN }),
              },
            }),
          },
        }),
      );
      return readAnimation(text);
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
