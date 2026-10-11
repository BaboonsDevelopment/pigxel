import { describe, expect, it } from "vitest";
import { DEFAULT_EXPORT } from "@/features/editor/export/constants";
import { readExportSettings } from "@/features/editor/export/saved-settings";

describe("saved export settings", () => {
  it("restores what was kept", () => {
    const kept = {
      ...DEFAULT_EXPORT,
      format: "gif",
      scale: 4,
      sheetTrim: true,
    };
    expect(readExportSettings(JSON.parse(JSON.stringify(kept)))).toEqual(kept);
  });
  it("falls back to defaults for broken values", () => {
    expect(
      readExportSettings({
        format: "bmp",
        scale: 999,
        layout: 3,
        sheetTrim: "yes",
      }),
    ).toEqual(DEFAULT_EXPORT);
    expect(readExportSettings(null)).toEqual(DEFAULT_EXPORT);
  });
});
