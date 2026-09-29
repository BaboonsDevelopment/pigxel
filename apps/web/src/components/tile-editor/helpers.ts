import type { Command, Shortcut, ToolId } from "./constants";
import { TOOLS } from "./tools";

/** Typing in a field must not trigger editor shortcuts. */
export function isTyping(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

/** The setting `[` and `]` change for a tool, if it has a size. */
export function sizeKey(
  tool: ToolId,
): "size" | "brushSize" | "eraserSize" | null {
  if (tool === "brush") return "brushSize";
  if (tool === "eraser") return "eraserSize";
  return tool === "pen" || tool === "line" ? "size" : null;
}

const command = (name: Command): Shortcut => ({ command: name });

/**
 * What a key press does in the editor, as in Aseprite and most drawing apps.
 * Keys are matched by position (`e.code`), so shortcuts work in any keyboard
 * layout, e.g. Ukrainian. Text fields keep their own keys, Ctrl+S and Ctrl+O
 * aside.
 */
export function shortcutFor(e: KeyboardEvent): Shortcut | null {
  const { code, shiftKey: shift } = e;
  const zoomIn = code === "Equal" || code === "NumpadAdd";
  const zoomOut = code === "Minus" || code === "NumpadSubtract";
  if (e.ctrlKey || e.metaKey) {
    if (e.altKey) return null;
    if (code === "KeyS" && !shift) return command("save");
    if (code === "KeyO" && !shift) return command("open");
    if (isTyping(e.target)) return null;
    if (code === "KeyZ") return command(shift ? "redo" : "undo");
    if (code === "KeyY") return command("redo");
    if (zoomIn) return command("zoomIn");
    if (zoomOut) return command("zoomOut");
    if (code === "Digit0" || code === "Numpad0") return command("zoomReset");
    return null;
  }
  if (isTyping(e.target)) return null;
  if (e.altKey) {
    if (code === "KeyN") return command("newFrame");
    if (code === "ArrowUp") return command("layerAbove");
    if (code === "ArrowDown") return command("layerBelow");
    return null;
  }
  if (shift) return code === "KeyN" ? command("newLayer") : null;
  if (zoomIn) return command("zoomIn");
  if (zoomOut) return command("zoomOut");
  if (code === "Comma") return command("previousFrame");
  if (code === "Period") return command("nextFrame");
  if (code === "BracketLeft") return command("penSmaller");
  if (code === "BracketRight") return command("penBigger");
  if (code === "Delete" || code === "Backspace") return command("clearLayer");
  const tool = TOOLS.find((t) => code === `Key${t.shortcut}`);
  return tool ? { tool: tool.id } : null;
}
