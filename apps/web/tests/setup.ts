import { vi } from "vitest";

vi.mock("@/lib/fonts/pixel", () => ({
  tiny5: { style: { fontFamily: "Tiny5" } },
  dotGothic16: { style: { fontFamily: "DotGothic16" } },
  silkscreen: { style: { fontFamily: "Silkscreen" } },
  pressStart2P: { style: { fontFamily: "Press Start 2P" } },
}));
