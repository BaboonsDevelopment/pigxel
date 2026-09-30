import { cn } from "@pigxel/ui/lib/utils";
import type { ToolId } from "../constants";
import { TOOLS } from "../tools";

export function ToolBar({
  tool,
  onSelect,
}: {
  tool: ToolId;
  onSelect: (tool: ToolId) => void;
}) {
  return (
    <nav
      aria-label="Tools"
      className="flex flex-col gap-1 border-r bg-background p-2"
    >
      {TOOLS.map(({ id, label, shortcut, icon }) => (
        <button
          key={id}
          type="button"
          title={`${label} (${shortcut})`}
          aria-label={label}
          aria-pressed={tool === id}
          onClick={() => onSelect(id)}
          className={cn(
            "flex size-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2",
            tool === id &&
              "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
          )}
        >
          {icon}
        </button>
      ))}
    </nav>
  );
}
