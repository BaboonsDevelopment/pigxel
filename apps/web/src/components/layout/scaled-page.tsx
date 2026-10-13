import type { ReactNode } from "react";
import { Page } from "@pigxel/ui/components/page";

export function ScaledPage({ children }: { children: ReactNode }) {
  return (
    <div className="xl:h-full xl:[container-type:size]">
      <Page className="max-w-[88rem] pb-6 xl:w-[1290px] xl:max-w-none xl:[zoom:max(0.8,min(tan(atan2(100cqw,1290px)),tan(atan2(100cqh,726px))))]">
        {children}
      </Page>
    </div>
  );
}
