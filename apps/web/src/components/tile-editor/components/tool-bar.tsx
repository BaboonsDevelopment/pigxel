import { cn } from "@pigxel/ui/lib/utils";
import type { ToolId } from "../constants";
import { toolTitle } from "../helpers";
import { TOOLS } from "../tools";

export function ToolBar({
  tool,
  onSelect,
}: {
  tool: ToolId;
  onSelect: (tool: ToolId) => void;
}) {
  return (
    <nav aria-label="Tools" className="grid grid-cols-2 gap-1 p-2">
      {TOOLS.map((entry) => (
        <button
          key={entry.id}
          type="button"
          title={toolTitle(entry)}
          aria-label={entry.label}
          aria-pressed={tool === entry.id}
          onClick={() => onSelect(entry.id)}
          className={cn(
            "flex size-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2",
            tool === entry.id &&
              "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
          )}
        >
          {entry.icon}
        </button>
      ))}
    </nav>
  );
}
