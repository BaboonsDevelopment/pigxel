import type { Stamp } from "../pixel-canvas/paint";
import type { PenSettings } from "../pixel-canvas/pen";
import type { SelectionApi } from "../pixel-canvas/use-selection";
import type { Slice } from "@/lib/slices/slices";
import type { Tool } from "../tools";
import { SelectionActions } from "../tools/shared/options";
import type { ToolOptionProps } from "../tools/types";

export function ToolOptions({
  tool,
  ...props
}: Omit<ToolOptionProps, "tool"> & {
  tool: Tool;
  pen: PenSettings;
  selection: SelectionApi;
  stamp: Stamp | null;
  slice: Slice | null;
}) {
  const options = tool.selects
    ? tool.options
    : [...tool.options, SelectionActions];
  return (
    <div className="flex w-full flex-wrap items-center gap-x-6 gap-y-2 text-sm">
      {options.map((Option, i) => (
        <Option key={i} tool={tool} {...props} />
      ))}

      <span className="group relative ml-auto">
        <span
          tabIndex={0}
          aria-label={tool.hint}
          className="grid size-6 cursor-help place-items-center rounded-full border text-xs text-muted-foreground hover:text-foreground"
        >
          i
        </span>
        <span
          aria-hidden="true"
          className="pointer-events-none invisible absolute top-full right-0 z-50 mt-2 w-72 rounded-md bg-foreground px-3 py-2 text-xs text-background shadow-md group-focus-within:visible group-hover:visible"
        >
          {tool.hint}
        </span>
      </span>
    </div>
  );
}
