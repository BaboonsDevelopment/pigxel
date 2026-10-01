"use server";

import { requireUser } from "@/lib/auth/session";
import type { CloudTileSummary } from "@/lib/pigxel-file/cloud";
import { listCloudTilesOnServer } from "@/lib/pigxel-file/cloud-server";
import { PAGE_SIZE } from "./constants";

/** Your next cloud tiles, after the `from` already shown. */
export async function loadCloudTiles(
  from: number,
): Promise<CloudTileSummary[]> {
  const user = await requireUser();
  if (!Number.isInteger(from) || from < 0) return [];
  return listCloudTilesOnServer(user.id, PAGE_SIZE, from);
}
