"use client";

import { unpublishArt } from "./actions";
import {
  confirmRemoveFromExplore,
  type RemovedArt,
} from "./components/remove-from-explore-dialog";

export async function removeFromExplore(
  art: RemovedArt,
): Promise<{ removed: boolean; error?: string }> {
  if (!(await confirmRemoveFromExplore(art))) return { removed: false };
  const result = await unpublishArt(art.id);
  return result.error
    ? { removed: false, error: result.error }
    : { removed: true };
}
