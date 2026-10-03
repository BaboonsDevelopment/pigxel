import { blurTool } from "./blur";
import { brushTool } from "./brush";
import { bucketTool } from "./bucket";
import { contourTool } from "./contour";
import { curveTool } from "./curve";
import { ellipseTool } from "./ellipse";
import { ellipseMarqueeTool } from "./ellipse-marquee";
import { eraserTool } from "./eraser";
import { gradientTool } from "./gradient";
import { jumbleTool } from "./jumble";
import { lassoTool } from "./lasso";
import { lineTool } from "./line";
import { marqueeTool } from "./marquee";
import { moveTool } from "./move";
import { penTool } from "./pen";
import { pipetteTool } from "./pipette";
import { polygonTool } from "./polygon";
import { polygonLassoTool } from "./polygon-lasso";
import { rectTool } from "./rect";
import { sliceTool } from "./slice";
import { sprayTool } from "./spray";
import { textTool } from "./text";
import { wandTool } from "./wand";
import type { ToolDefinition, ToolGroupId } from "./types";

export type { ToolHandlers } from "./types";

export const TOOLS = [
  marqueeTool,
  ellipseMarqueeTool,
  lassoTool,
  polygonLassoTool,
  wandTool,
  moveTool,
  penTool,
  brushTool,
  sprayTool,
  eraserTool,
  lineTool,
  curveTool,
  rectTool,
  ellipseTool,
  contourTool,
  polygonTool,
  bucketTool,
  gradientTool,
  blurTool,
  jumbleTool,
  textTool,
  sliceTool,
  pipetteTool,
] as const satisfies readonly ToolDefinition[];

export type ToolId = (typeof TOOLS)[number]["id"];

export type Tool = ToolDefinition<ToolId>;

const GROUP_LABELS: { id: ToolGroupId; label: string }[] = [
  { id: "select", label: "Select" },
  { id: "move", label: "Move" },
  { id: "draw", label: "Draw" },
  { id: "shapes", label: "Lines & shapes" },
  { id: "fill", label: "Fill" },
  { id: "effects", label: "Effects" },
  { id: "text", label: "Text & slices" },
  { id: "pick", label: "Pick colour" },
];

export const TOOL_GROUPS = GROUP_LABELS.map((group) => ({
  ...group,
  tools: TOOLS.filter((tool) => tool.group === group.id).map(
    (tool): ToolId => tool.id,
  ),
}));

export const toolById = (id: ToolId): Tool =>
  TOOLS.find((tool) => tool.id === id)!;

export const groupOf = (id: ToolId) =>
  TOOL_GROUPS.find((group) => group.tools.includes(id));
