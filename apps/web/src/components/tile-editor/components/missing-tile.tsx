import Link from "next/link";
import { buttonVariants } from "@pigxel/ui/components/button";
import { EmptyState } from "@pigxel/ui/components/empty-state";

export function MissingTile() {
  return (
    <main className="flex h-dvh items-center justify-center bg-canvas p-6">
      <EmptyState
        className="max-w-md bg-background"
        title="This tile isn’t in this browser"
        description="Tiles you haven’t saved to Pigxel cloud or Google Drive stay in the browser they were made in."
        action={
          <Link href="/tiles" className={buttonVariants({ size: "lg" })}>
            Go to My projects
          </Link>
        }
      />
    </main>
  );
}
