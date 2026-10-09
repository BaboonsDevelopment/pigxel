import {
  BANNER_HEIGHT,
  PROFILE_GRID,
} from "@/features/profile/components/profile-hero/constants";
import { Page } from "@pigxel/ui/components/page";
import { Skeleton } from "@pigxel/ui/components/skeleton";

export default function Loading() {
  return (
    <Page
      aria-busy="true"
      aria-label="Loading"
      className="max-w-[100rem] px-5 pt-3 pb-12 md:px-8 md:pt-2 xl:px-10"
    >
      <Skeleton className={`${BANNER_HEIGHT} w-full rounded-xl`} />
      <div className="flex gap-4 px-6">
        <Skeleton className="relative z-10 -mt-8 size-32 rounded-full border-4 border-white" />
        <div className="flex-1 space-y-2 pt-3">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-72 max-w-full" />
        </div>
      </div>
      <div className="mt-8 flex gap-3">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-lg" />
        ))}
      </div>
      <Skeleton className="mt-8 h-8 w-64" />
      <div className={`mt-5 ${PROFILE_GRID}`}>
        {Array.from({ length: 10 }, (_, i) => (
          <Skeleton key={i} className="aspect-[204/215] rounded-xl" />
        ))}
      </div>
    </Page>
  );
}
