import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  IMAGE_STYLE_RULES,
  REFERENCE_RULES,
} from "@/features/ai/constants";
import { buildImagePrompt } from "@/features/ai/helpers";

const doc = readFileSync(
  join(import.meta.dirname, "..", "..", "..", "docs", "chatgpt-art-prompt.md"),
  "utf8",
).replace(/\s+/g, " ");

describe("ChatGPT art prompt doc", () => {
  it("has the image prompt template word for word", () => {
    const prompt = buildImagePrompt("{subject}", 999, 777).replace(
      "999x777",
      "{width}x{height}",
    );
    expect(doc).toContain(prompt.replace(/\s+/g, " "));
  });

  it("has every style rule and the reference rule", () => {
    for (const rule of [...IMAGE_STYLE_RULES, REFERENCE_RULES])
      expect(doc).toContain(rule.replace(/\s+/g, " "));
  });
});
