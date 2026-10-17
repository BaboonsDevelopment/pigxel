import { Page } from "@pigxel/ui/components/page";
import { Skeleton } from "@pigxel/ui/components/skeleton";
import { PageTransition } from "@/components/layout/page-transition";

export default function Loading() {
  return (
    <PageTransition>
      <Page
        aria-busy="true"
        aria-label="Loading plans"
        className="flex min-h-full max-w-6xl flex-col pt-6 pb-5 md:pt-6"
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Skeleton className="h-11 w-64" />
            <Skeleton className="mt-3 h-4 w-96 max-w-full" />
          </div>
          <Skeleton className="h-11 w-56 rounded-full" />
        </div>
        <div className="mt-10 grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:gap-5">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-[30rem] rounded-3xl" />
          ))}
        </div>
        <Skeleton className="mx-auto mt-8 h-4 w-[36rem] max-w-full" />
      </Page>
    </PageTransition>
  );
}
