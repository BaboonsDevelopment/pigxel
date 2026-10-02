"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@pigxel/ui/components/button";
import { FormMessage } from "@pigxel/ui/components/field";
import { assetDocument, findAsset } from "@/lib/assets/assets";
import { createDraft } from "@/lib/pigxel-file/draft";
import { blankDocument, serializePigxel } from "@/lib/pigxel-file/format";
import { guideUrl } from "@/lib/pigxel-file/open-tile";
import { findTutorial } from "@/lib/tutorials/tutorials";

/**
 * Opens the editor on a fresh practice tile, kept in this browser, with the
 * tutorial's guide walking through it.
 */
export function StartGuideButton({
  userId,
  slug,
}: {
  userId: string;
  slug: string;
}) {
  const router = useRouter();
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const start = () => {
    const tutorial = findTutorial(slug);
    if (!tutorial) return;
    const { name, width, height, asset, frames } = tutorial.practice;
    const from = findAsset(asset);
    const image = from
      ? assetDocument(from, { frames })
      : blankDocument(width, height, "transparent");
    const draft = createDraft(userId, {
      name,
      file: serializePigxel(image),
      location: null,
      dirty: false,
    });
    if (!draft) {
      setError(true);
      return;
    }
    setBusy(true);
    router.push(guideUrl(draft.id, slug));
  };

  return (
    <div>
      <Button type="button" size="lg" disabled={busy} onClick={start}>
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
