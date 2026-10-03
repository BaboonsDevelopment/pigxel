import type { ToolOptionProps } from "../types";
import { SliceOptions } from "./slice-fields";

export function SliceOption({
  slice,
  onSliceChange,
  onSliceDelete,
}: ToolOptionProps) {
  if (!slice) return null;
  return (
    <SliceOptions
      slice={slice}
      onChange={onSliceChange}
      onDelete={onSliceDelete}
    />
  );
}
