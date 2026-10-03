import { Skeleton } from "@pigxel/ui/components/skeleton";

/** The chat's body while its code loads. */
export function ChatPlaceholder() {
  return (
    <div className="space-y-3 p-4" aria-hidden="true">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-16 w-full" />
    </div>
  );
}
