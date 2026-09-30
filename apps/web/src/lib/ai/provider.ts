import "server-only";
import {
  GEMINI_IMAGE_MODELS,
  GEMINI_TEXT_MODELS,
  OPENAI_IMAGE_MODELS,
  OPENAI_IMAGE_QUALITY,
  OPENAI_SMART_MODELS,
  OPENAI_TEXT_MODELS,
} from "./constants";
import { createGeminiProvider } from "./providers/gemini";
import { createOpenAiProvider } from "./providers/openai";
import type { AiProvider } from "./types";

type ProviderName = "openai" | "gemini";

/** The model from env first, then the fallbacks, without repeats. */
const withPreferred = (preferred: string | undefined, fallbacks: string[]) =>
  [
    ...new Set([preferred?.trim(), ...fallbacks].filter((m) => !!m)),
  ] as string[];

const nameOf = (value: string | undefined): ProviderName =>
  value?.trim() === "gemini" ? "gemini" : "openai";

/**
 * A provider; the models chosen in env apply only to what it is used for
 * (`roles`), so with two providers each gets its own.
 */
function create(
  name: ProviderName,
  roles: { text: boolean; image: boolean },
): AiProvider {
  const env: Record<string, string | undefined> = {
    ...process.env,
    AI_MODEL: roles.text ? process.env.AI_MODEL : undefined,
    AI_SMART_MODEL: roles.text ? process.env.AI_SMART_MODEL : undefined,
    AI_IMAGE_MODEL: roles.image ? process.env.AI_IMAGE_MODEL : undefined,
  };
  if (name === "gemini") {
    if (!env.GEMINI_API_KEY)
      throw new Error("Add GEMINI_API_KEY to apps/web/.env.local.");
    return createGeminiProvider(env.GEMINI_API_KEY, {
      text: withPreferred(env.AI_MODEL, GEMINI_TEXT_MODELS),
      smart: withPreferred(env.AI_SMART_MODEL, GEMINI_TEXT_MODELS),
      image: withPreferred(env.AI_IMAGE_MODEL, GEMINI_IMAGE_MODELS),
    });
  }
  if (!env.OPENAI_API_KEY)
    throw new Error("Add OPENAI_API_KEY to apps/web/.env.local.");
  return createOpenAiProvider(
    env.OPENAI_API_KEY,
    {
      text: withPreferred(env.AI_MODEL, OPENAI_TEXT_MODELS),
      smart: withPreferred(env.AI_SMART_MODEL, OPENAI_SMART_MODELS),
      image: withPreferred(env.AI_IMAGE_MODEL, OPENAI_IMAGE_MODELS),
    },
    env.AI_IMAGE_QUALITY?.trim() || OPENAI_IMAGE_QUALITY,
  );
}

/**
 * The AI in use. AI_PROVIDER picks who answers and plans (OpenAI unless it
 * is "gemini"); AI_IMAGE_PROVIDER picks who draws, the same one unless set,
 * so text can come from OpenAI and pictures from Gemini. AI_MODEL (talk),
 * AI_SMART_MODEL (plans and pixel edits) and AI_IMAGE_MODEL pick the models
 * to try first, each for the provider doing that job.
 */
export function getAiProvider(): AiProvider {
  const textName = nameOf(process.env.AI_PROVIDER);
  const imageName = nameOf(
    process.env.AI_IMAGE_PROVIDER || process.env.AI_PROVIDER,
  );
  if (imageName === textName)
    return create(textName, { text: true, image: true });
  const text = create(textName, { text: true, image: false });
  const image = create(imageName, { text: false, image: true });
  return {
    ...text,
    aspectRatios: image.aspectRatios,
    backdrop: image.backdrop,
    generate: image.generate,
    redraw: image.redraw,
  };
}
