import type {
  ComponentType,
  PointerEvent,
  ReactNode,
  Ref,
  RefObject,
} from "react";
import type { PaintOptions, Stamp } from "../pixel-canvas/paint";
import type { ColorSlot, PenSettings, Point } from "../pixel-canvas/pen";
import type { SelectionApi } from "../pixel-canvas/use-selection";
import type { SpriteApi } from "../pixel-canvas/use-sprite";
import type { Slice } from "@/lib/slices/slices";
import type { SavedBrush } from "../brush-library";

export type ToolGroupId =
  "select" | "move" | "draw" | "shapes" | "fill" | "effects" | "text" | "pick";

export type SizeKey = "size" | "brushSize" | "eraserSize" | "sprayWidth";

export type TipShape = "square" | "round" | "line";

export type ToolTip = { size: number; shape: TipShape; outline: boolean };

export type ToolOptionProps = {
  tool: ToolDefinition;
  pen: PenSettings;
  onChange: (pen: PenSettings) => void;
  selection: SelectionApi;
  stamp: Stamp | null;
  onClearStamp: () => void;
  onUseAsBrush: () => void;
  brushes: SavedBrush[];
  onSaveBrush: () => void;
  onPickBrush: (stamp: Stamp) => void;
  onRemoveBrush: (id: string) => void;
  slice: Slice | null;
  onSliceChange: (slice: Slice) => void;
  onSliceDelete: () => void;
};

export type ToolOption = ComponentType<ToolOptionProps>;

export type CanvasPointer = PointerEvent<HTMLCanvasElement>;

export type ToolHandlers = {
  down?: (e: CanvasPointer, point: Point) => void;
  move?: (e: CanvasPointer, passed: Point[]) => void;
  up?: () => void;
  doubleClick?: () => void;
  pending?: () => boolean;
};

export type ToolContext = {
  tool: ToolDefinition;
  pen: PenSettings;
  sprite: SpriteApi;
  selection: SelectionApi;
  stamp: Stamp | null;
  scale: number;
  stretch: { x: number; y: number };
  snap: number;
  paintOptions: PaintOptions;
  paused: boolean;
  lastPointRef: RefObject<Point | null>;
  pickColor: (point: Point, slot: ColorSlot) => void;
  onUseColor?: (color: string) => void;
  onTextPlaced?: () => void;
  sliceId: string | null;
  onSelectSlice?: (id: string | null) => void;
};

export type ToolCanvasProps = ToolContext & { ref: Ref<ToolHandlers> };

export type ToolDefinition<Id extends string = string> = {
  id: Id;
  label: string;
  shortcut: string;
  shift?: boolean;
  icon: ReactNode;
  group: ToolGroupId;
  hint: string;
  size?: { key: SizeKey; label?: string };
  stamp?: boolean;
  selects?: boolean;
  anyLayer?: boolean;
  wholeLayer?: boolean;
  cursor?: "move" | "text" | "selection";
  tip?: (pen: PenSettings) => ToolTip;
  options: ToolOption[];
  canvas: ComponentType<ToolCanvasProps>;
};

export function defineTool<const Id extends string>(
  tool: ToolDefinition<Id>,
): ToolDefinition<Id> {
  return tool;
}
