import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { unzlibSync } from "fflate";
import { describe, expect, it } from "vitest";
import { parsePigxel } from "@/lib/pigxel-file/format";
import { checkAsset } from "../scripts/assets/lib/checks";
import { framesOf, pigxelFile, sheetOf } from "../scripts/assets/lib/pigxel";
import { encodePng } from "../scripts/assets/lib/png";
import { reviewState } from "../scripts/assets/lib/review";
import {
  isPremium,
  loadAssetById,
  loadPackById,
  loadPacks,
  parseAsset,
  updatePack,
  type PackSource,
} from "../scripts/assets/lib/source";

const PACK: PackSource = {
  id: "test",
  name: "Test",
  tier: "free",
  block: null,
  background: null,
  premium: [],
  description: "",
  palette: ["#181425", "#63c74d", "#3e8948", "#a7f070", "#ffffff"],
  style: { outline: "#181425", maxColors: 5 },
  palettes: [],
  assets: [],
  issues: [],
};

const COLORS = { k: "#181425", g: "#63c74d", d: "#3e8948", w: "#ffffff" };

const blob = [
  "........",
  "..kkkk..",
  ".kgwggk.",
  ".kggggk.",
  ".kgdddk.",
  "..kkkk..",
  "........",
  "........",
];

function asset(overrides: Record<string, unknown> = {}) {
  return {
    id: "blob",
    name: "Blob",
    kind: "sprite",
    colors: COLORS,
    clips: [{ name: "idle", kind: "variant", frames: [blob] }],
    ...overrides,
  };
}

const rules = (json: unknown, pack = PACK) => {
  const { def, issues } = parseAsset(json, "blob");
  return [...issues, ...(def ? checkAsset(def, pack) : [])].map(
    (i) => `${i.level}:${i.rule}`,
  );
};

describe("asset source", () => {
  it("loads only listed art for a preview", () => {
    const dir = mkdtempSync(join(tmpdir(), "pack-preview-"));
    mkdirSync(join(dir, "kit"));
    writeFileSync(join(dir, "kit", "pack.json"), JSON.stringify({ assets: ["blob"] }));
    writeFileSync(join(dir, "kit", "blob.json"), JSON.stringify(asset()));
    writeFileSync(join(dir, "kit", "hidden.json"), JSON.stringify(asset({ id: "hidden" })));
    expect(loadAssetById("kit", "blob", dir)?.def?.name).toBe("Blob");
    expect(loadPackById("kit", dir)?.assets.map((item) => item.id)).toContain("blob");
    expect(loadAssetById("kit", "hidden", dir)).toBeNull();
    expect(loadAssetById("../kit", "blob", dir)).toBeNull();
    expect(loadPackById("../kit", dir)).toBeNull();
  });

  it("parses a pixel grid into frames", () => {
    const { def, issues } = parseAsset(asset(), "blob");
    expect(issues).toEqual([]);
    const frames = framesOf(def!);
    expect([frames.w, frames.h, frames.frames.length]).toEqual([8, 8, 1]);
  });

  it("rejects ragged rows, unknown keys and mismatched frames", () => {
    const ragged = asset({
      clips: [{ name: "idle", kind: "variant", frames: [["...", ".."]] }],
    });
    expect(rules(ragged)).toContain("error:grid");
    const unknown = asset({
      clips: [{ name: "idle", kind: "variant", frames: [["..x", "..."]] }],
    });
    expect(rules(unknown)).toContain("error:grid");
    const sizes = asset({
      clips: [{ name: "a", kind: "animation", frames: [blob, ["..", ".."]] }],
    });
    expect(rules(sizes)).toContain("error:grid");
  });

  it("requires the id to match the file", () => {
    expect(rules(asset({ id: "other" }))).toContain("error:schema");
  });
});

describe("asset checks", () => {
  it("passes a clean outlined sprite", () => {
    expect(rules(asset()).filter((r) => r.startsWith("error"))).toEqual([]);
  });

  it("rejects colours outside the pack palette", () => {
    expect(rules(asset({ colors: { ...COLORS, g: "#123456" } }))).toContain(
      "error:palette",
    );
  });

  it("rejects clear pixels in tiles and flags seams", () => {
    expect(rules(asset({ kind: "tile" }))).toContain("error:tile");
    const seam = Array.from({ length: 8 }, () => "gggggggk");
    expect(
      rules(
        asset({
          kind: "tile",
          clips: [{ name: "a", kind: "variant", frames: [seam] }],
        }),
      ),
    ).toContain("warning:seam");
    const even = Array.from({ length: 8 }, () => "gdgdgdgd");
    expect(
      rules(
        asset({
          kind: "tile",
          clips: [{ name: "a", kind: "variant", frames: [even] }],
        }),
      ),
    ).not.toContain("warning:seam");
  });

  it("flags lone pixels, missing outlines and frozen animations", () => {
    const stray = [...blob.slice(0, 7), "......w."];
    expect(
      rules(
        asset({ clips: [{ name: "i", kind: "variant", frames: [stray] }] }),
      ),
    ).toContain("warning:stray");
    const bare = blob.map((row) => row.replaceAll("k", "g"));
    expect(
      rules(asset({ clips: [{ name: "i", kind: "variant", frames: [bare] }] })),
    ).toContain("warning:outline");
    expect(
      rules(
        asset({
          clips: [{ name: "i", kind: "animation", frames: [blob, blob] }],
        }),
      ),
    ).toContain("warning:animation");
  });
});

describe("review state", () => {
  const entry = { status: "approved", note: "", hash: "a", at: "" } as const;
  it("goes stale when the drawing changes", () => {
    expect(reviewState({ hash: "a" }, entry)).toBe("approved");
    expect(reviewState({ hash: "b" }, entry)).toBe("changed");
    expect(reviewState({ hash: "a" }, undefined)).toBe("pending");
  });
});

describe("premium", () => {
  it("covers the whole block on a paid tier, else only listed assets", () => {
    expect(isPremium({ tier: "paid", premium: [] }, "a")).toBe(true);
    expect(isPremium({ tier: "free", premium: ["a"] }, "a")).toBe(true);
    expect(isPremium({ tier: "free", premium: ["a"] }, "b")).toBe(false);
  });

  it("reads premium ids from pack.json and keeps only listed assets", () => {
    const dir = mkdtempSync(join(tmpdir(), "packs-"));
    mkdirSync(join(dir, "kit"));
    writeFileSync(
      join(dir, "kit", "pack.json"),
      JSON.stringify({
        id: "kit",
        name: "Kit",
        tier: "free",
        palette: "endesga-32",
        assets: [],
        premium: ["gone"],
      }),
    );
    expect(loadPacks(dir)[0]!.premium).toEqual([]);
    expect(loadPacks(dir)[0]!.block).toBeNull();
    updatePack("kit", (json) => (json.name = "Forest"), dir);
    const saved = JSON.parse(
      readFileSync(join(dir, "kit", "pack.json"), "utf8"),
    );
    expect(saved.name).toBe("Forest");
    expect(saved.premium).toEqual(["gone"]);
    updatePack("kit", (json) => (json.block = "Not An Id"), dir);
    expect(loadPacks(dir)[0]!.issues.map((i) => i.rule)).toEqual(["pack"]);
  });
});

const packs = loadPacks();
const drawn = packs.flatMap((pack) =>
  pack.assets.map((source) => [source.key, source, pack] as const),
);

describe("drawn packs", () => {
  it("read without pack problems", () => {
    expect(packs.flatMap((p) => p.issues)).toEqual([]);
  });

  it.runIf(drawn.length).each(drawn)(
    "%s has no errors and opens in the editor",
    (_, source, pack) => {
      const errors = [
        ...source.issues,
        ...(source.def ? checkAsset(source.def, pack) : []),
      ].filter((i) => i.level === "error");
      expect(errors).toEqual([]);
      const frames = framesOf(source.def!);
      const doc = parsePigxel(pigxelFile(source.def!, frames));
      expect([doc.width, doc.height]).toEqual([frames.w, frames.h]);
      expect(doc.frames.length).toBe(frames.frames.length);
    },
  );
});

it("writes PNG sheets with the frames side by side", () => {
  const { def } = parseAsset(
    asset({
      clips: [
        { name: "a", kind: "animation", frames: [blob, [...blob].reverse()] },
      ],
    }),
    "blob",
  );
  const sheet = sheetOf(framesOf(def!));
  const png = encodePng(sheet.w, sheet.h, sheet.data);
  const view = new DataView(png.buffer);
  expect([view.getUint32(16), view.getUint32(20)]).toEqual([16, 8]);
  const idatLength = view.getUint32(33);
  expect(new TextDecoder().decode(png.subarray(37, 41))).toBe("IDAT");
  const raw = unzlibSync(png.subarray(41, 41 + idatLength));
  expect(raw.length).toBe(sheet.h * (sheet.w * 4 + 1));
});
