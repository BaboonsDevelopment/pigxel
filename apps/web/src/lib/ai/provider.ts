import "server-only";
import { IMAGE_MODELS, TEXT_MODELS } from "./constants";
import { createGeminiProvider } from "./providers/gemini";
import type { AiProvider } from "./types";

/** The model from env first, then the fallbacks, without repeats. */
const withPreferred = (preferred: string | undefined, fallbacks: string[]) =>
  [
    ...new Set([preferred?.trim(), ...fallbacks].filter((m) => !!m)),
  ] as string[];

/** Google Gemini; AI_MODEL and AI_IMAGE_MODEL pick the models to try first. */
export function getAiProvider(): AiProvider {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Add GEMINI_API_KEY to apps/web/.env.local.");
  return createGeminiProvider(apiKey, {
    text: withPreferred(process.env.AI_MODEL, TEXT_MODELS),
    image: withPreferred(process.env.AI_IMAGE_MODEL, IMAGE_MODELS),
  });
}
