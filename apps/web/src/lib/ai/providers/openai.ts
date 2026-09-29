import "server-only";
import {
  CHAT_PROMPT,
  IMAGE_RETRY_DELAYS_MS,
  OPENAI_BASE_URL,
  OPENAI_IMAGE_SIZES,
  OPENAI_IMAGE_TIMEOUT_MS,
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
import type { AiProvider, GeneratedImage } from "../types";

/**
 * OpenAI: a cheap text model that reads pictures and answers in strict JSON
 * (Chat Completions), and gpt-image for pictures (Images API).
 */

type Part =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };
type Message = {
  role: "system" | "user" | "assistant";
  content: string | Part[];
};
type Completion = {
  choices?: {
    message?: { content?: string | null; refusal?: string | null };
  }[];
};

export function createOpenAiProvider(
  apiKey: string,
  /** Models to try in order, for text and for pictures. */
  models: { text: string[]; image: string[] },
  /** gpt-image quality: low, medium or high. */
  quality: string,
): AiProvider {
  const authorization = `Bearer ${apiKey}`;

  /** A response, or the error it stands for; a model this key can't use is "unavailable". */
  const check = async (res: Response) => {
    if (res.ok) return res;
    const detail = await res.text();
    if (/model_not_found|does not exist/.test(detail))
      throw new AiError("unavailable", `OpenAI: ${detail}`);
    throw errorForStatus("OpenAI", res.status, detail);
  };

  /** The model's answer; with `schema`, JSON in exactly that shape. */
  const complete = (messages: Message[], schema?: object) =>
    tryModels(
      models.text,
      async (model) => {
        const res = await fetchWithin(
          `${OPENAI_BASE_URL}/chat/completions`,
          {
            method: "POST",
            headers: { authorization, "content-type": "application/json" },
            body: JSON.stringify({
              model,
              messages,
              ...(schema && {
                response_format: {
                  type: "json_schema",
                  json_schema: { name: "answer", strict: true, schema },
                },
              }),
            }),
          },
          TEXT_ATTEMPT_TIMEOUT_MS,
        );
        const data = (await (await check(res)).json()) as Completion;
        const message = data.choices?.[0]?.message;
        if (message?.refusal) throw new AiError("failed", message.refusal);
        return message?.content ?? "";
      },
      TEXT_RETRY_DELAYS_MS,
    );

  /** A JSON answer to `prompt` about the picture `tile`, shaped by `schema`. */
  const look = (prompt: string, tile: GeneratedImage, schema: object) =>
    complete(
      [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: { url: `data:${tile.mimeType};base64,${tile.base64}` },
            },
          ],
        },
      ],
      schema,
    );

  /** Draws `prompt`, or changes `picture` as it says. */
  const draw = (
    prompt: string,
    aspectRatio: string,
    picture?: GeneratedImage,
  ): Promise<GeneratedImage> =>
    tryModels(
      models.image,
      async (model) => {
        const size = OPENAI_IMAGE_SIZES[aspectRatio] ?? "1024x1024";
        let res: Response;
        if (picture) {
          const form = new FormData();
          form.append("model", model);
          form.append("prompt", prompt);
          form.append("size", size);
          form.append("quality", quality);
          form.append(
            "image",
            new Blob([Buffer.from(picture.base64, "base64")], {
              type: picture.mimeType,
            }),
            "picture.png",
          );
          res = await fetchWithin(
            `${OPENAI_BASE_URL}/images/edits`,
            { method: "POST", headers: { authorization }, body: form },
            OPENAI_IMAGE_TIMEOUT_MS,
          );
        } else {
          res = await fetchWithin(
            `${OPENAI_BASE_URL}/images/generations`,
            {
              method: "POST",
              headers: { authorization, "content-type": "application/json" },
              body: JSON.stringify({ model, prompt, size, quality, n: 1 }),
            },
            OPENAI_IMAGE_TIMEOUT_MS,
          );
        }
        const data = (await (await check(res)).json()) as {
          data?: { b64_json?: string }[];
        };
        const base64 = data.data?.[0]?.b64_json;
        if (!base64) throw new AiError("failed", "OpenAI returned no image.");
        return { mimeType: "image/png", base64 };
      },
      IMAGE_RETRY_DELAYS_MS,
    );

  return {
    aspectRatios: Object.keys(OPENAI_IMAGE_SIZES),

    async route(messages) {
      const text = await complete(
        [{ role: "system", content: ROUTER_PROMPT }, ...messages],
        object({
          intent: { type: "string", enum: [...INTENTS] },
          subject: STRING,
          where: STRING,
          count: INTEGER,
          name: STRING,
          frames: INTEGER,
        }),
      );
      return readRoute(text, messages.at(-1)?.content ?? "");
    },

    chat: (messages) =>
      complete([{ role: "system", content: CHAT_PROMPT }, ...messages]),

    async edit(system, user) {
      const text = await complete(
        [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        object({ summary: STRING, ops: array(STRING) }),
      );
      return readEdit(text);
    },

    generate: (prompt, aspectRatio) => draw(prompt, aspectRatio),

    redraw: (prompt, picture, aspectRatio) =>
      draw(prompt, aspectRatio, picture),

    async compose(prompt, tile) {
      return readRect(await look(prompt, tile, RECT));
    },

    async place(prompt, tile) {
      const text = await look(
        prompt,
        tile,
        object({
          copyOf: INTEGER,
          areas: array(RECT),
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
          mode: { type: "string", enum: ["ops", "move", "redraw"] },
          objects: array(INTEGER),
          keep: array(INTEGER),
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
          tracks: array(
            object({
              kind: { type: "string", enum: ["sheet", "prop"] },
              name: STRING,
              subject: STRING,
              reuse: INTEGER,
              box: RECT,
              poses: array(STRING),
              path: array(object({ ...RECT.properties, visible: BOOLEAN })),
            }),
          ),
        }),
      );
      return readAnimation(text);
    },
  };
}

// JSON Schema for strict structured outputs: every property required, no others.
const STRING = { type: "string" };
const INTEGER = { type: "integer" };
const BOOLEAN = { type: "boolean" };
const array = (items: object) => ({ type: "array", items });
const object = <P extends Record<string, object>>(properties: P) => ({
  type: "object",
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});
const RECT = object({ x: INTEGER, y: INTEGER, w: INTEGER, h: INTEGER });
