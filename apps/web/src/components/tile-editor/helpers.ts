import type { Command, Shortcut, ToolId } from "./constants";
import { TOOLS } from "./tools";

export function isTyping(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

export function sizeKey(
  tool: ToolId,
): "size" | "brushSize" | "eraserSize" | "sprayWidth" | null {
  if (tool === "brush" || tool === "blur" || tool === "jumble")
    return "brushSize";
  if (tool === "eraser") return "eraserSize";
  if (tool === "spray") return "sprayWidth";
  return tool === "pen" ||
    tool === "line" ||
    tool === "curve" ||
    tool === "rect" ||
    tool === "ellipse"
    ? "size"
    : null;
}

export function toolTitle(tool: {
  label: string;
  shortcut: string;
  shift?: boolean;
}) {
  return `${tool.label} (${tool.shift ? "Shift+" : ""}${tool.shortcut})`;
}

const command = (name: Command): Shortcut => ({ command: name });

const toolKey = (code: string, shift: boolean): Shortcut | null => {
  const tool = TOOLS.find(
    (t) => !!t.shift === shift && code === `Key${t.shortcut}`,
  );
  return tool ? { tool: tool.id } : null;
};

const NUDGES: Record<string, Command> = {
  ArrowUp: "nudgeUp",
  ArrowDown: "nudgeDown",
  ArrowLeft: "nudgeLeft",
  ArrowRight: "nudgeRight",
};

export function shortcutFor(e: KeyboardEvent): Shortcut | null {
  const { code, shiftKey: shift } = e;
  const zoomIn = code === "Equal" || code === "NumpadAdd";
  const zoomOut = code === "Minus" || code === "NumpadSubtract";
  if (e.ctrlKey || e.metaKey) {
    if (e.altKey) return null;
    if (code === "KeyS" && !shift) return command("save");
    if (code === "KeyO" && !shift) return command("open");
    if (code === "KeyE" && !shift) return command("export");
    if (isTyping(e.target)) return null;
    if (code === "KeyZ") return command(shift ? "redo" : "undo");
    if (code === "KeyY") return command("redo");
    if (code === "KeyI" && shift) return command("invertSelection");
    if (code === "KeyD" && shift) return command("reselect");
    if (shift) return null;
    if (code === "KeyA") return command("selectAll");
    if (code === "KeyD") return command("deselect");
    if (code === "KeyC") return command("copy");
    if (code === "KeyX") return command("cut");
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
  if (shift) {
    if (code === "KeyN") return command("newLayer");
    if (code === "KeyH") return command("flipHorizontal");
    if (code === "KeyV") return command("flipVertical");
    return toolKey(code, true);
  }
  if (zoomIn) return command("zoomIn");
  if (zoomOut) return command("zoomOut");
  if (code === "Comma") return command("previousFrame");
  if (code === "Period") return command("nextFrame");
  if (code === "BracketLeft") return command("penSmaller");
  if (code === "BracketRight") return command("penBigger");
  if (code === "Delete" || code === "Backspace") return command("clearLayer");
  if (code === "Enter" || code === "NumpadEnter")
    return command("dropSelection");
  if (code === "Escape") return command("deselect");
  if (code === "KeyX") return command("swapColors");
  if (code === "F3") return command("toggleOnion");
  if (NUDGES[code]) return command(NUDGES[code]);
  return toolKey(code, false);
}
