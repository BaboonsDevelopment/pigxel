// Runs before every unit and component test file.
import { createElement } from "react";
import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { navigation } from "./next";
import { checkNetwork, guardNetwork, server } from "./network";
import { supabase } from "./supabase";

// Server-only modules refuse to load outside a React Server environment.
vi.mock("server-only", () => ({}));
vi.mock("@/lib/fonts/pixel", () => ({
  tiny5: { style: { fontFamily: "Tiny5" } },
  dotGothic16: { style: { fontFamily: "DotGothic16" } },
  silkscreen: { style: { fontFamily: "Silkscreen" } },
  pressStart2P: { style: { fontFamily: "Press Start 2P" } },
}));

// next/font only works inside Next's compiler: each font is a plain object here.
vi.mock("next/font/google", () => {
  const font = () => ({
    className: "",
    variable: "",
    style: { fontFamily: "" },
  });
  return {
    DM_Mono: font,
    Fredoka: font,
    Geist: font,
    Geist_Pixel: font,
    Inter: font,
    Manrope: font,
    Pixelify_Sans: font,
    Poppins: font,
  };
});
// Static image imports are plain URLs outside Next, which next/image rejects.
vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string | { src: string }; alt: string }) =>
    createElement("img", { src: typeof src === "string" ? src : src.src, alt }),
}));

beforeAll(guardNetwork);
afterEach(() => {
  supabase.reset();
  navigation.reset();
  checkNetwork();
});
afterAll(() => server.close());
