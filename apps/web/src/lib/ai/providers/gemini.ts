import "server-only";
import { GEMINI_BASE_URL } from "../constants";
import type { AiProvider } from "../types";

type GeminiPart = {
  text?: string;
  inlineData?: { mimeType?: string; data?: string };
};
type GeminiResponse = { candidates?: { content?: { parts?: GeminiPart[] } }[] };
type GeminiContent = { role: "user" | "model"; parts: { text: string }[] };

export function createGeminiProvider(
  apiKey: string,
  models: { edit: string; generate: string },
): AiProvider {
  const request = async (model: string, contents: GeminiContent[]) => {
    const res = await fetch(
      `${GEMINI_BASE_URL}/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({ contents }),
      },
    );
    if (!res.ok) {
      throw new Error(`Gemini responded ${res.status}: ${await res.text()}`);
    }
    const data = (await res.json()) as GeminiResponse;
    return data.candidates?.[0]?.content?.parts ?? [];
  };

  return {
    async edit(messages) {
      const parts = await request(
        models.edit,
        messages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
      );
      return parts.map((p) => p.text ?? "").join("");
    },

    async generate(prompt) {
      const parts = await request(models.generate, [
        { role: "user", parts: [{ text: prompt }] },
      ]);
      const image = parts.find((p) => p.inlineData?.data)?.inlineData;
      if (!image?.data) throw new Error("Gemini returned no image.");
      return { mimeType: image.mimeType ?? "image/png", base64: image.data };
    },
  };
}
