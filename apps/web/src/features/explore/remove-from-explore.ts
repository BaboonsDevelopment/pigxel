"use client";

import { confirmDialog } from "@/components/ui/confirm-dialog";
import { unpublishArt } from "./actions";

export async function removeFromExplore(tile: {
  id: string;
  name: string;
}): Promise<{ removed: boolean; error?: string }> {
  const confirmed = await confirmDialog({
    title: "Remove from Explore?",
    message: `“${tile.name}” won’t be on Explore anymore. Its likes and comments come back if you publish it again.`,
    confirmLabel: "Remove",
  });
  if (!confirmed) return { removed: false };
  const result = await unpublishArt(tile.id);
  return result.error
    ? { removed: false, error: result.error }
    : { removed: true };
}
