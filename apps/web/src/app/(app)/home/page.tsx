import type { Metadata } from "next";
import { HomeView, RECENT } from "@/features/home/components/home-view";
import { requireUser } from "@/lib/auth/session";
import { listCloudTilesOnServer } from "@/lib/pigxel-file/cloud-server";
import { hasAiAccess, hasPremiumAccess } from "@/features/billing/server";
import { listFinishedTutorials } from "@/features/tutorials/server";
import { listTrendingWorks } from "@/features/home/trending";

export const metadata: Metadata = { title: "Home · Pigxel" };
export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await requireUser();
  const [cloudTiles, aiAllowed, premium, finished, trending] =
    await Promise.all([
      listCloudTilesOnServer(user.id, RECENT),
      // If the plan can't be read, offer AI; it still checks the plan on use.
      hasAiAccess(user.id).catch(() => true),
      // Premium tutorials stay hidden unless access is confirmed.
      hasPremiumAccess(user).catch(() => false),
      listFinishedTutorials(user.id),
      listTrendingWorks(user.id).catch((error: unknown) => {
        console.error(error);
        return null;
      }),
    ]);
  return (
    <HomeView
      userId={user.id}
      cloudTiles={cloudTiles}
      aiAllowed={aiAllowed}
      tutorials={{ premium, finished: [...finished] }}
      trending={trending}
    />
  );
}
