import type { ReactNode } from "react";
import { Page } from "@pigxel/ui/components/page";

export function ScaledPage({ children }: { children: ReactNode }) {
  return (
    <div className="lg:h-full lg:[container-type:size]">
      <Page className="max-w-[88rem] pb-6 lg:w-[1290px] lg:max-w-none lg:[zoom:max(0.8,min(tan(atan2(100cqw,1290px)),tan(atan2(100cqh,726px))))]">
        {children}
      </Page>
    </div>
  );
}
