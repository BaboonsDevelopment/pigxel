import "server-only";
import { DEFAULT_GEMINI_MODEL } from "./constants";
import { createGeminiProvider } from "./providers/gemini";
import type { AiProvider } from "./types";

export function getAiProvider(): AiProvider {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Add GEMINI_API_KEY to apps/web/.env.local.");
  return createGeminiProvider(
    apiKey,
    process.env.AI_MODEL || DEFAULT_GEMINI_MODEL,
  );
}
