"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@pigxel/ui/components/button";
import { FormMessage } from "@pigxel/ui/components/field";

/**
 * For admins: puts the starter set (the first sprites and tiles, drawn in
 * code) on the Assets page through the same publishing as the editor. The
 * drawings load only on click, so nobody else downloads them; importing
 * again replaces those assets.
 */
export function ImportStarterSet() {
  const router = useRouter();
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const importAll = async () => {
    setError(null);
    try {
      const [{ STARTER_ASSETS, starterDocument }, { publishAsset }] =
        await Promise.all([
          import("@/lib/assets/starter"),
          import("@/lib/assets/publish"),
        ]);
      for (const [i, asset] of STARTER_ASSETS.entries()) {
        setProgress(`Importing ${i + 1} of ${STARTER_ASSETS.length}…`);
        await publishAsset({
          id: asset.id,
          name: asset.name,
          category: asset.category,
          document: starterDocument(asset),
          sort: i,
        });
      }
      setProgress(null);
      router.refresh();
    } catch (e) {
      setProgress(null);
      setError(
        e instanceof Error ? e.message : "Couldn’t import them. Try again.",
      );
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        type="button"
        variant="secondary"
        disabled={progress !== null}
        onClick={() => void importAll()}
      >
        {progress ?? "Import the starter set"}
      </Button>
      {error && <FormMessage tone="error">{error}</FormMessage>}
    </div>
  );
}
