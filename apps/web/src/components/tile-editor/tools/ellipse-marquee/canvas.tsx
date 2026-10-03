import { MarqueeSelect } from "../shared/marquee-select";
import type { ToolCanvasProps } from "../types";

export function EllipseMarqueeCanvas(props: ToolCanvasProps) {
  return <MarqueeSelect {...props} ellipse />;
}
