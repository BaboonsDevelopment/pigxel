"use client";

import Link from "next/link";
import { useSyncExternalStore, type ReactNode } from "react";
import { buttonVariants } from "@pigxel/ui/components/button";
import { EmptyState } from "@pigxel/ui/components/empty-state";

const WIDE = "(min-width: 1024px)";

const subscribe = () => () => {};

export function WideScreenOnly({ children }: { children: ReactNode }) {
  const wide = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(WIDE).matches,
    () => null,
  );
  if (wide === null) return <div className="h-dvh bg-muted" aria-busy="true" />;
  if (wide) return children;
  return (
    <main className="flex h-dvh items-center justify-center bg-canvas p-6">
      <EmptyState
        className="max-w-md bg-background"
        title="The editor needs a bigger screen"
        description="Open this tile on a computer or a tablet turned sideways. Everything saved to Pigxel cloud is waiting there."
        action={
          <Link href="/tiles" className={buttonVariants({ size: "lg" })}>
            Go to My projects
          </Link>
        }
      />
    </main>
  );
}
