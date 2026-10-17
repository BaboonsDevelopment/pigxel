import { NextResponse, type NextRequest } from "next/server";
import {
  moveAssets,
  moveAssetsToFront,
  tagAssets,
} from "@/features/asset-review/production";
import {
  failed,
  guard,
  removeFromProduction,
  ReviewError,
} from "@/features/asset-review/server";

/** One change to a selection of published assets. */
export async function POST(request: NextRequest) {
  const denied = guard(request);
  if (denied) return denied;
  try {
    const { action, ids, packId, add, remove } = await request
      .json()
      .catch(() => ({}));
    if (action === "move") await moveAssets(ids, packId);
    else if (action === "tags") await tagAssets(ids, { add, remove });
    else if (action === "front") await moveAssetsToFront(ids);
    else if (action === "delete") {
      if (!Array.isArray(ids) || !ids.length)
        throw new ReviewError("Pick the assets to delete.");
      for (const id of ids) await removeFromProduction(id);
    } else throw new ReviewError("Unknown action.");
    return NextResponse.json({ ok: true });
  } catch (e) {
    return failed(e);
  }
}
