import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { TOOL_GROUPS, TOOLS } from "@/components/tile-editor/tools";
import {
  SizeOption,
  StampOption,
} from "@/components/tile-editor/tools/shared/options";

const folder = join(__dirname, "../src/components/tile-editor/tools");
const kebab = (id: string) =>
  id.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

describe("the tool registry", () => {
  it("registers every tool folder, once", () => {
    const folders = readdirSync(folder).filter(
      (name) => name !== "shared" && statSync(join(folder, name)).isDirectory(),
    );
    expect(TOOLS.map((t) => kebab(t.id)).sort()).toEqual(folders.sort());
    expect(new Set(TOOLS.map((t) => t.id)).size).toBe(TOOLS.length);
  });

  it("gives every tool its own key", () => {
    const keys = TOOLS.map((t) => `${t.shift ? "Shift+" : ""}${t.shortcut}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("puts every tool in a group, with a hint", () => {
    for (const tool of TOOLS) {
      expect(TOOL_GROUPS.some((g) => g.id === tool.group)).toBe(true);
      expect(tool.hint.length).toBeGreaterThan(10);
    }
  });

  it("shows the size field for tools that have a size, and the picture brush for stamp tools", () => {
    for (const tool of TOOLS) {
      const options: unknown[] = [...tool.options];
      if ("size" in tool) expect(options).toContain(SizeOption);
      if ("stamp" in tool) expect(options).toContain(StampOption);
    }
  });
});
