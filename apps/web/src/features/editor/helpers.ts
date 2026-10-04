import type { ToolId } from "./constants";
import { toolById } from "./tools";
import type { SizeKey } from "./tools/types";

export function isTyping(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

export function sizeKey(tool: ToolId): SizeKey | null {
  return toolById(tool).size?.key ?? null;
}

export const toolTitle = (label: string, key?: string) =>
  key ? `${label} (${key})` : label;
