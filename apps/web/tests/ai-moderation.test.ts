import { describe, expect, it, vi } from "vitest";
import { moderate } from "@/features/ai/moderation";
import { AiError } from "@/features/ai/errors";

vi.mock("server-only", () => ({}));

const reply = (decision: string, status = 200) =>
  vi.fn(async () => new Response(JSON.stringify({ decision }), { status }));

const live = { CREEM_API_KEY: "creem_abc", NODE_ENV: "production" };

async function codeOf(run: Promise<unknown>) {
  try {
    await run;
    return "ok";
  } catch (e) {
    return e instanceof AiError ? e.code : "other";
  }
}

describe("prompt moderation", () => {
  it("lets allowed prompts through and sends them to Creem", async () => {
    const fetcher = reply("allow");
    await moderate(["a red fox", " "], "user-1", live, fetcher);
    const [url, init] = fetcher.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("https://api.creem.io/v1/moderation/prompt");
    expect(init.headers).toMatchObject({ "x-api-key": "creem_abc" });
    expect(JSON.parse(String(init.body))).toEqual({
      prompt: "a red fox",
      external_id: "user-1",
    });
  });

  it("uses the test API with a test key", async () => {
    const fetcher = reply("allow");
    await moderate(
      ["a fox"],
      undefined,
      { ...live, CREEM_API_KEY: "creem_test_abc" },
      fetcher,
    );
    expect((fetcher.mock.calls[0] as unknown[])[0]).toBe(
      "https://test-api.creem.io/v1/moderation/prompt",
    );
  });

  it("blocks flagged and denied prompts", async () => {
    expect(await codeOf(moderate(["x"], undefined, live, reply("flag")))).toBe(
      "blocked",
    );
    expect(await codeOf(moderate(["x"], undefined, live, reply("deny")))).toBe(
      "blocked",
    );
  });

  it("fails closed when Creem can't answer", async () => {
    expect(
      await codeOf(moderate(["x"], undefined, live, reply("allow", 503))),
    ).toBe("moderation");
    const down = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });
    expect(await codeOf(moderate(["x"], undefined, live, down))).toBe(
      "moderation",
    );
    expect(
      await codeOf(
        moderate(["x"], undefined, { NODE_ENV: "production" }, reply("allow")),
      ),
    ).toBe("moderation");
  });

  it("skips empty prompts and local development without a key", async () => {
    const fetcher = reply("deny");
    await moderate(["  "], undefined, live, fetcher);
    await moderate(["x"], undefined, { NODE_ENV: "development" }, fetcher);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
