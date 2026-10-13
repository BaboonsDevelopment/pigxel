"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { buttonVariants } from "@pigxel/ui/components/button";
import { EmptyState } from "@pigxel/ui/components/empty-state";
import { CloudError } from "@/lib/pigxel-file/cloud";
import { PigxelFileError } from "@/lib/pigxel-file/format";
import { draftForCloudTile, editorUrl } from "@/lib/pigxel-file/open-tile";

export function OpenSharedProject({
  userId,
  tile,
}: {
  userId: string;
  tile: { id: string; name: string };
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    draftForCloudTile(userId, tile).then(
      (draftId) => router.replace(editorUrl(draftId)),
      (e: unknown) =>
        setError(
          e instanceof CloudError || e instanceof PigxelFileError
            ? e.message
            : "Couldn’t open the project.",
        ),
    );
  }, [userId, tile, router]);

  return (
    <EmptyState
      title={error ? "Couldn’t open this project" : `Opening “${tile.name}”…`}
      description={error ?? "It’s also in the Shared tab of My projects."}
      action={
        error && (
          <Link
            href="/tiles?tab=shared"
            className={buttonVariants({ variant: "secondary" })}
          >
            Go to Shared
          </Link>
        )
      }
    />
  );
}
