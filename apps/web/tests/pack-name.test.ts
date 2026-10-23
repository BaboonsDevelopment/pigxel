import { expect, it } from "vitest";
import { packName } from "../scripts/assets/lib/asset";

it("drops a trailing size from a pack name", () => {
  expect(packName("Pirate Crew · 64×64")).toBe("Pirate Crew");
  expect(packName("Pirate Crew (32x32)")).toBe("Pirate Crew");
  expect(packName("Pirate Crew - 128px")).toBe("Pirate Crew");
  expect(packName("Levers & Switches · 64 × 64")).toBe("Levers & Switches");
  expect(packName("Pirate Crew 16X16")).toBe("Pirate Crew");
});

it("leaves names without a trailing size alone", () => {
  expect(packName("Pirate Crew")).toBe("Pirate Crew");
  expect(packName("Area 51")).toBe("Area 51");
  expect(packName("2048 Tiles")).toBe("2048 Tiles");
  expect(packName("Post-Catastrophe Settlement")).toBe(
    "Post-Catastrophe Settlement",
  );
});
