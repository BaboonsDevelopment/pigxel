import { pointTip } from "../shared/tips";
import { defineTool } from "../types";
import { TileCanvas } from "./canvas";
import { icon } from "./icon";

export const tileTool = defineTool({
  id: "tile",
  label: "Place tile",
  shortcut: "P",
  icon,
  group: "tiles",
  hint: "On a tilemap layer: click places the tile picked in the Tileset panel · Right-click clears a cell · Alt+click picks a cell’s tile",
  tip: pointTip(true),
  options: [],
  canvas: TileCanvas,
});
