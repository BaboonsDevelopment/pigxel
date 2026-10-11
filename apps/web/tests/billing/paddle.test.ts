import { describe, expect, it } from "vitest";
import {
  countryFromHeaders,
  paddleClientConfig,
  paddleEnvironment,
} from "@/features/billing/paddle";

describe("paddle environment", () => {
  it("accepts sandbox and production", () => {
    expect(paddleEnvironment({ PADDLE_ENVIRONMENT: "sandbox" })).toBe(
      "sandbox",
    );
    expect(paddleEnvironment({ PADDLE_ENVIRONMENT: "production" })).toBe(
      "production",
    );
  });

  it("refuses to default when unset or unknown", () => {
    expect(() => paddleEnvironment({})).toThrow(/PADDLE_ENVIRONMENT/);
    expect(() => paddleEnvironment({ PADDLE_ENVIRONMENT: "live" })).toThrow(
      /PADDLE_ENVIRONMENT/,
    );
  });

  it("requires a client token for the same environment", () => {
    expect(
      paddleClientConfig({
        PADDLE_ENVIRONMENT: "sandbox",
        PADDLE_CLIENT_TOKEN: "test_abc",
      }),
    ).toEqual({ environment: "sandbox", token: "test_abc" });
    expect(() => paddleClientConfig({ PADDLE_ENVIRONMENT: "sandbox" })).toThrow(
      /PADDLE_CLIENT_TOKEN/,
    );
    expect(() =>
      paddleClientConfig({
        PADDLE_ENVIRONMENT: "production",
        PADDLE_CLIENT_TOKEN: "test_abc",
      }),
    ).toThrow(/live_/);
  });
});

describe("country from headers", () => {
  const from = (init: Record<string, string>) =>
    countryFromHeaders(new Headers(init));

  it("reads Vercel's header, then Cloudflare's", () => {
    expect(from({ "x-vercel-ip-country": "de" })).toBe("DE");
    expect(from({ "cf-ipcountry": "UA" })).toBe("UA");
  });

  it("leaves the country to Paddle when it's missing or unknown", () => {
    expect(from({})).toBeUndefined();
    expect(from({ "cf-ipcountry": "XX" })).toBeUndefined();
    expect(from({ "cf-ipcountry": "T1" })).toBeUndefined();
    expect(from({ "x-vercel-ip-country": "OTHERS" })).toBeUndefined();
  });
});
