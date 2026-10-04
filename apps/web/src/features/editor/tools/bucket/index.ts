import {
  ContiguousOption,
  DitherOption,
  ToleranceOption,
} from "../shared/options";
import { pointTip } from "../shared/tips";
import { defineTool } from "../types";
import { BucketCanvas } from "./canvas";
import { icon } from "./icon";
import { FillFromOption, TextureOption } from "./options";

export const bucketTool = defineTool({
  id: "bucket",
  label: "Paint bucket",
  shortcut: "G",
  icon,
  group: "fill",
  hint: "Click fills · Right-click fills with the secondary colour",
  tip: pointTip(),
  options: [
    DitherOption,
    ContiguousOption,
    FillFromOption,
    ToleranceOption,
    TextureOption,
  ],
  canvas: BucketCanvas,
});
