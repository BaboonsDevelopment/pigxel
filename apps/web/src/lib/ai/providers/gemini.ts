import "server-only";
import { GEMINI_BASE_URL } from "../constants";
import type { AiProvider } from "../types";

type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
};

export function createGeminiProvider(
  apiKey: string,
  model: string,
): AiProvider {
  return {
    async reply(messages) {
      const res = await fetch(
        `${GEMINI_BASE_URL}/models/${model}:generateContent`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            contents: messages.map((m) => ({
              role: m.role === "assistant" ? "model" : "user",
              parts: [{ text: m.content }],
            })),
          }),
        },
      );
      if (!res.ok) {
        throw new Error(`Gemini responded ${res.status}: ${await res.text()}`);
      }

      const data = (await res.json()) as GeminiResponse;
      return (
        data.candidates?.[0]?.content?.parts
          ?.map((p) => p.text ?? "")
          .join("") ?? ""
      );
    },
  };
}
