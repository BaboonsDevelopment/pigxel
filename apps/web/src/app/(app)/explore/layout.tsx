import type { ReactNode } from "react";
import { ScaledPage } from "@/components/scaled-page";

export default function ExploreLayout({ children }: { children: ReactNode }) {
  return <ScaledPage>{children}</ScaledPage>;
}
