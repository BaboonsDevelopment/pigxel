import type { ReactNode } from "react";
import { Page } from "@pigxel/ui/components/page";

export default function CollectionsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-full bg-canvas bg-[url(/art/background-effect.png)] bg-top bg-repeat">
      <Page className="max-w-[100rem] px-5 pt-3 pb-12 md:px-8 md:pt-2 xl:px-10">
        {children}
      </Page>
    </div>
  );
}
