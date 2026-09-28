import "server-only";
import { DEFAULT_EDIT_MODEL, DEFAULT_IMAGE_MODEL } from "./constants";
import { createGeminiProvider } from "./providers/gemini";
import type { AiProvider } from "./types";

export function getAiProvider(): AiProvider {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Add GEMINI_API_KEY to apps/web/.env.local.");
  return createGeminiProvider(apiKey, {
    edit: process.env.AI_MODEL || DEFAULT_EDIT_MODEL,
    generate: process.env.AI_IMAGE_MODEL || DEFAULT_IMAGE_MODEL,
  });
}
