import type { Metadata } from "next";
import { HomeView, RECENT } from "@/features/home/components/home-view";
import { requireUser } from "@/lib/auth/session";
import { listCloudTilesOnServer } from "@/lib/pigxel-file/cloud-server";
import { hasAiAccess } from "@/features/billing/server";

export const metadata: Metadata = { title: "Home · Pigxel" };
export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await requireUser();
  const [cloudTiles, aiAllowed] = await Promise.all([
    listCloudTilesOnServer(user.id, RECENT),
    // If the plan can't be read, offer AI; it still checks the plan on use.
    hasAiAccess(user.id).catch(() => true),
  ]);
  return (
    <HomeView userId={user.id} cloudTiles={cloudTiles} aiAllowed={aiAllowed} />
  );
}
