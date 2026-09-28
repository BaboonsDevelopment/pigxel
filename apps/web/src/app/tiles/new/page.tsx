import type { Metadata } from "next";
import { TileEditor } from "@/components/tile-editor/tile-editor";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "New tile · Pigxel" };
export const dynamic = "force-dynamic";

export default async function NewTile() {
  await requireUser();
  return <TileEditor />;
}
