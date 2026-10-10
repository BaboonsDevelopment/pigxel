import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { describe, expect, it } from "vitest";
import nextConfig from "../next.config";
import { config } from "@/proxy";

const runsOn = (url: string) =>
  unstable_doesMiddlewareMatch({ config, nextConfig, url });

describe("proxy matcher", () => {
  it.each([
    "/",
    "/login",
    "/home",
    "/tiles/edit?id=t1",
    "/u/artist",
    "/api/paddle/webhook",
  ])("runs on %s", (url) => expect(runsOn(url)).toBe(true));

  it.each([
    "/_next/static/chunks/app.js",
    "/_next/image?url=%2Fart%2Flogo.png&w=64&q=75",
    "/favicon.ico",
    "/art/pigxel-logo.png",
    "/art/sidebar-landscape.webp",
  ])("skips static file %s", (url) => expect(runsOn(url)).toBe(false));
});
