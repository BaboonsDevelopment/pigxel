import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { checkNetwork, server } from "@test/network";

describe("network guard", () => {
  it("serves requests from handlers", async () => {
    server.use(
      http.get("https://api.pigxel.test/ping", () =>
        HttpResponse.json({ ok: true }),
      ),
    );
    const response = await fetch("https://api.pigxel.test/ping");
    expect(await response.json()).toEqual({ ok: true });
  });

  it("fails unmocked requests, even when the caller swallows the error", async () => {
    await fetch("https://example.com/").catch(() => null);
    expect(checkNetwork).toThrow(
      /Unmocked network requests[\s\S]*GET https:\/\/example\.com\//,
    );
    expect(checkNetwork).not.toThrow();
  });

  it("leaves data URLs alone", async () => {
    const response = await fetch("data:text/plain,hello");
    expect(await response.text()).toBe("hello");
  });
});
