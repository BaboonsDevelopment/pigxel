import type { Metadata } from "next";
import { HomeView, RECENT } from "@/components/home/home-view";
import { requireUser } from "@/lib/auth/session";
import { listCloudTilesOnServer } from "@/lib/pigxel-file/cloud-server";

export const metadata: Metadata = { title: "Home · Pigxel" };
export const dynamic = "force-dynamic";

/** Home, with the signed-in person's latest cloud tiles. */
export default async function Home() {
  const user = await requireUser();
  const cloudTiles = await listCloudTilesOnServer(user.id, RECENT);
  return <HomeView userId={user.id} cloudTiles={cloudTiles} />;
}
