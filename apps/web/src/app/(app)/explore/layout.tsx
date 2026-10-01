import type { ReactNode } from "react";
import { Page } from "@pigxel/ui/components/page";
import { ExploreTabs } from "./explore-tabs";

export default function ExploreLayout({ children }: { children: ReactNode }) {
  return (
    <Page className="max-w-[88rem]">
      <ExploreTabs />
      <div className="pt-8">{children}</div>
    </Page>
  );
}
