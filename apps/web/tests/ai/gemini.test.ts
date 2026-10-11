import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "@test/network";
import { supabase } from "@test/supabase";

vi.mock(
  "@/lib/supabase/server",
  async () => (await import("@test/supabase")).supabaseModules.server,
);

import { AiError } from "@/features/ai/errors";
import { createGeminiProvider } from "@/features/ai/providers/gemini";

const endpoint = (model: string) =>
  new RegExp(`/models/${model}:generateContent$`);

const answer = (reply: object) =>
  HttpResponse.json({
    candidates: [{ content: { parts: [{ text: JSON.stringify(reply) }] } }],
    usageMetadata: { promptTokenCount: 120, candidatesTokenCount: 8 },
  });

const catRoute = {
  intent: "generate",
  subject: "a cat",
  count: 1,
  name: "Cat",
};
const ai = createGeminiProvider("test-key", {
  text: ["model-a", "model-b"],
  image: [],
});
const ask = () => ai.route([{ role: "user", content: "draw a cat" }]);

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
});

describe("Gemini provider", () => {
  it("asks the first model with the API key and reads its JSON reply", async () => {
    const requests: Request[] = [];
    server.use(
      http.post(endpoint("model-a"), ({ request }) => {
        requests.push(request.clone());
        return answer(catRoute);
      }),
    );
    expect(await ask()).toMatchObject({
      intent: "generate",
      subject: "a cat",
      name: "Cat",
    });
    expect(requests[0]!.headers.get("x-goog-api-key")).toBe("test-key");
    expect(await requests[0]!.json()).toMatchObject({
      contents: [{ role: "user", parts: [{ text: "draw a cat" }] }],
      generationConfig: { responseMimeType: "application/json" },
    });
  });

  it("falls back to the next model when one is overloaded", async () => {
    const tried: string[] = [];
    server.use(
      http.post(endpoint("model-a"), () => {
        tried.push("a");
        return new HttpResponse("busy", { status: 503 });
      }),
      http.post(endpoint("model-b"), () => {
        tried.push("b");
        return answer(catRoute);
      }),
    );
    expect((await ask()).intent).toBe("generate");
    expect(tried).toEqual(["a", "b"]);
  });

  it("stops at a refused API key instead of trying other models", async () => {
    const tried: string[] = [];
    server.use(
      http.post(endpoint("model-a"), () => {
        tried.push("a");
        return new HttpResponse("bad key", { status: 401 });
      }),
      http.post(endpoint("model-b"), () => {
        tried.push("b");
        return answer(catRoute);
      }),
    );
    await expect(ask()).rejects.toEqual(
      expect.objectContaining({ code: "denied" }),
    );
    await expect(ask()).rejects.toBeInstanceOf(AiError);
    expect(tried).toEqual(["a", "a"]);
  });

  it("records the tokens each answer used", async () => {
    server.use(http.post(endpoint("model-a"), () => answer(catRoute)));
    await ask();
    expect(supabase.callsTo("ai_usage.insert")[0]).toMatchObject({
      values: {
        step: "route",
        model: "model-a",
        input_tokens: 120,
        output_tokens: 8,
      },
    });
  });
});
