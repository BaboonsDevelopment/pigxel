import type { ToolOptionProps } from "../types";
import { TransformOptions } from "./transform-fields";

export function MoveTransformOption({ selection }: ToolOptionProps) {
  if (!selection.mask) return null;
  return <TransformOptions selection={selection} />;
}
