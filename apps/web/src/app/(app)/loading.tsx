import { Page } from "@pigxel/ui/components/page";
import { Skeleton } from "@pigxel/ui/components/skeleton";

/** Shown while a signed-in page loads its data; the sidebar stays in place. */
export default function Loading() {
  return (
    <Page aria-busy="true" aria-label="Loading">
      <Skeleton className="h-9 w-56" />
      <Skeleton className="mt-3 h-4 w-80 max-w-full" />
      <div className="mt-10 grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-4">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="aspect-square rounded-lg" />
        ))}
      </div>
    </Page>
  );
}
