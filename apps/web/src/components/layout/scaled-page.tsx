import type { ReactNode } from "react";
import { Page } from "@pigxel/ui/components/page";

/**
 * A 1290px-wide design scaled down to fit smaller screens, never up: a bigger
 * screen gets a wider layout (up to a cap), so grids inside can add columns
 * with container queries (@min-[…]) instead of growing.
 */
export function ScaledPage({ children }: { children: ReactNode }) {
  return (
    <div className="xl:h-full xl:[container-type:size]">
      <Page className="@container max-w-[88rem] pb-6 xl:w-[min(1840px,max(1290px,calc(100cqw/var(--zoom))))] xl:max-w-none xl:[--zoom:max(0.8,min(1,tan(atan2(100cqw,1290px)),tan(atan2(100cqh,726px))))] xl:[zoom:var(--zoom)]">
        {children}
      </Page>
    </div>
  );
}
