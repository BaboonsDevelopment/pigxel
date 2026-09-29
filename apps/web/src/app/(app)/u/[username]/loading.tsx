import { Page } from "@pigxel/ui/components/page";
import { Skeleton } from "@pigxel/ui/components/skeleton";

/** A profile loading: header, then the gallery. */
export default function Loading() {
  return (
    <Page aria-busy="true" aria-label="Loading">
      <div className="flex flex-col gap-6 sm:flex-row">
        <Skeleton className="size-24 rounded-full sm:size-28" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
      </div>
      <div className="mt-12 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="aspect-square rounded-xl" />
        ))}
      </div>
    </Page>
  );
}
