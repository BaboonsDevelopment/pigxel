import "server-only";
import {
  CHAT_PROMPT,
  GEMINI_ASPECT_RATIOS,
  GEMINI_BASE_URL,
  IMAGE_ATTEMPT_TIMEOUT_MS,
  IMAGE_RETRY_DELAYS_MS,
  ROUTER_PROMPT,
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

/**
 * Google Gemini. Kept as an alternative to OpenAI; used when AI_PROVIDER is
 * "gemini" (see provider.ts).
 */

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
  /** Models to try in order: for talk, for plans and pixel edits, for pictures. */
  models: { text: string[]; smart: string[]; image: string[] },
): AiProvider {
  /** Sends a request, moving on to the next model when one can't answer. */
  const request = (
    candidates: string[],
    body: object,
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
            body: JSON.stringify(body),
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
      await request(models.smart, {
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

  const draw = async (parts: GeminiContent["parts"], aspectRatio: string) =>
    firstImage(
      await request(
        models.image,
        {
          contents: [{ role: "user", parts }],
          generationConfig: { imageConfig: { aspectRatio } },
        },
        { timeoutMs: IMAGE_ATTEMPT_TIMEOUT_MS, delays: IMAGE_RETRY_DELAYS_MS },
      ),
    );

  return {
    aspectRatios: GEMINI_ASPECT_RATIOS,
    backdrop: "chroma",
    // No mask: the edit is still limited to its part when put on the tile.
    masks: false,

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
      const parts = await request(models.smart, {
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

    generate: (prompt, aspectRatio) => draw([{ text: prompt }], aspectRatio),

    redraw: (prompt, picture, aspectRatio) =>
      draw(
        [
          { text: prompt },
          {
            inlineData: { mimeType: picture.mimeType, data: picture.base64 },
          },
        ],
        aspectRatio,
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
          area: RECT,
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
