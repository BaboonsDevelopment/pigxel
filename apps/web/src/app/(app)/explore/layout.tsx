import type { ReactNode } from "react";
import { Page } from "@pigxel/ui/components/page";

export default function ExploreLayout({ children }: { children: ReactNode }) {
  return <Page className="max-w-[88rem]">{children}</Page>;
}
