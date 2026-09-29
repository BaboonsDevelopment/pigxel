import "server-only";
import {
  GEMINI_IMAGE_MODELS,
  GEMINI_TEXT_MODELS,
  OPENAI_IMAGE_MODELS,
  OPENAI_IMAGE_QUALITY,
  OPENAI_TEXT_MODELS,
} from "./constants";
import { createGeminiProvider } from "./providers/gemini";
import { createOpenAiProvider } from "./providers/openai";
import type { AiProvider } from "./types";

/** The model from env first, then the fallbacks, without repeats. */
const withPreferred = (preferred: string | undefined, fallbacks: string[]) =>
  [
    ...new Set([preferred?.trim(), ...fallbacks].filter((m) => !!m)),
  ] as string[];

/**
 * The AI in use: OpenAI, or Google Gemini when AI_PROVIDER is "gemini".
 * AI_MODEL and AI_IMAGE_MODEL pick the models to try first.
 */
export function getAiProvider(): AiProvider {
  if (process.env.AI_PROVIDER === "gemini") {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("Add GEMINI_API_KEY to apps/web/.env.local.");
    return createGeminiProvider(apiKey, {
      text: withPreferred(process.env.AI_MODEL, GEMINI_TEXT_MODELS),
      image: withPreferred(process.env.AI_IMAGE_MODEL, GEMINI_IMAGE_MODELS),
    });
  }
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Add OPENAI_API_KEY to apps/web/.env.local.");
  return createOpenAiProvider(
    apiKey,
    {
      text: withPreferred(process.env.AI_MODEL, OPENAI_TEXT_MODELS),
      image: withPreferred(process.env.AI_IMAGE_MODEL, OPENAI_IMAGE_MODELS),
    },
    process.env.AI_IMAGE_QUALITY?.trim() || OPENAI_IMAGE_QUALITY,
  );
}
