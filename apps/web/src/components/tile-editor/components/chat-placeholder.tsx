import { Skeleton } from "@pigxel/ui/components/skeleton";
import { PANEL_WIDTH } from "@/components/chat-panel/constants";

/** The chat's frame while its code loads. */
export function ChatPlaceholder() {
  return (
    <aside
      style={{ width: PANEL_WIDTH.initial }}
      className="flex min-h-0 flex-col border-l bg-background"
    >
      <header className="flex h-14 shrink-0 items-center border-b px-4">
        <h2 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          Assistant
        </h2>
      </header>
      <div className="space-y-3 p-4" aria-hidden="true">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-16 w-full" />
      </div>
    </aside>
  );
}
