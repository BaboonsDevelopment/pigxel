import type { Metadata } from "next";
import Link from "next/link";
import { Page } from "@pigxel/ui/components/page";
import { PixelBackdrop } from "@/components/home/pixel-backdrop";
import { RecentProjects } from "@/components/home/recent-projects";
import { StartCreating } from "@/components/home/start-creating";
import { requireUser } from "@/lib/auth/session";
import { listCloudTilesOnServer } from "@/lib/pigxel-file/cloud-server";

export const metadata: Metadata = { title: "Home · Pigxel" };
export const dynamic = "force-dynamic";

/** How many recent projects Home shows before the "New project" card. */
const RECENT = 4;

/** Home: ways to start something new, then the latest projects. */
export default async function Home() {
  const user = await requireUser();
  const cloudTiles = await listCloudTilesOnServer(user.id, RECENT);
  return (
    <div className="relative">
      <PixelBackdrop />
      <Page className="relative max-w-[88rem]">
        <section aria-labelledby="start-heading">
          <h1
            id="start-heading"
            className="mb-4 font-display text-2xl tracking-tight"
          >
            Start creating
          </h1>
          <StartCreating />
        </section>

        <section aria-labelledby="recent-heading" className="mt-12">
          <div className="mb-4 flex items-end justify-between gap-4">
            <h2
              id="recent-heading"
              className="font-display text-2xl tracking-tight"
            >
              Recent projects
            </h2>
            <Link
              href="/tiles"
              className="text-xs font-medium text-[#9a78d0] hover:underline"
            >
              View all <span aria-hidden="true">→</span>
            </Link>
          </div>
          <RecentProjects
            userId={user.id}
            cloudTiles={cloudTiles}
            limit={RECENT}
          />
        </section>
      </Page>
    </div>
  );
}
