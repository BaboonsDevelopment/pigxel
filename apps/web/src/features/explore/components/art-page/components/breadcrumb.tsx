"use client";

import { type ReactNode } from "react";
import { BackButton } from "@/components/navigation/back-button";

/** Keep the back control with the artwork on both desktop and mobile. */
export function Breadcrumb({ children }: { children?: ReactNode }) {
  return (
    <nav
      aria-label="Artwork navigation"
      className="mb-5 flex items-center gap-3"
    >
      <BackButton href="/explore" preferHistory={false}>
        Back to Explore
      </BackButton>
      {children}
    </nav>
  );
}
