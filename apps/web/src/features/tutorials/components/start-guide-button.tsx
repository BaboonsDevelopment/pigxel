"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@pigxel/ui/components/button";
import { FormMessage } from "@pigxel/ui/components/field";
import { loadAssetDocument, type Asset } from "@/lib/assets/assets";
import { createDraft, loadDrafts } from "@/lib/pigxel-file/draft";
import { blankDocument, serializePigxel } from "@/lib/pigxel-file/format";
import { guideUrl } from "@/lib/pigxel-file/open-tile";
import { findTutorial } from "@/lib/tutorials/tutorials";

export function StartGuideButton({
  userId,
  slug,
  asset,
}: {
  userId: string;
  slug: string;
  asset: Asset | null;
}) {
  const router = useRouter();
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const start = async () => {
    const tutorial = findTutorial(slug);
    if (!tutorial) return;
    const { name, width, height, frames } = tutorial.practice;
    setBusy(true);
    const image = await (
      asset
        ? loadAssetDocument(asset, { frames })
        : Promise.reject(new Error("No asset"))
    ).catch(() => blankDocument(width, height, "transparent"));
    await loadDrafts(userId);
    const draft = createDraft(userId, {
      name,
      file: serializePigxel(image),
      location: null,
      dirty: false,
    });
    if (!draft) {
      setError(true);
      setBusy(false);
      return;
    }
    router.push(guideUrl(draft.id, slug));
  };

  return (
    <div>
      <Button
        type="button"
        size="lg"
        disabled={busy}
        onClick={() => void start()}
      >
        {busy ? "Opening the editor…" : "Start the interactive guide"}
      </Button>
      {error && (
        <FormMessage tone="error" className="mt-2">
          This browser won’t keep the practice tile. Allow site data for Pigxel,
          or remove some tiles from this browser.
        </FormMessage>
      )}
    </div>
  );
}
