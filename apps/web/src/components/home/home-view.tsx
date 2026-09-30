import Link from "next/link";
import { Page } from "@pigxel/ui/components/page";
import type { CloudTileSummary } from "@/lib/pigxel-file/cloud";
import { PixelBackdrop } from "./pixel-backdrop";
import { PopularTemplates } from "./popular-templates";
import { RecentProjects } from "./recent-projects";
import { StartCreating } from "./start-creating";
import { Tutorials } from "./tutorials";

/** How many recent projects Home shows before the "New project" card. */
export const RECENT = 4;

/**
 * Home: ways to start something new, the latest projects, then templates and
 * tutorials side by side.
 *
 * On wide screens it never scrolls and looks the same on every display: the
 * page is laid out at one design size (a 1290 × 726 area, what a MacBook's
 * browser has under the top bar) and zoomed as a whole, text included, to fit
 * the space it gets. The zoom is the smaller of the width and height ratios;
 * `tan(atan2(a, b))` is a / b as a plain number, which CSS can't divide
 * lengths into directly. Below 0.8 the text gets too small, so the page
 * scrolls instead.
 */
export function HomeView({
  userId,
  cloudTiles,
}: {
  userId: string;
  cloudTiles: CloudTileSummary[];
}) {
  return (
    <div className="relative lg:h-full lg:[container-type:size]">
      <PixelBackdrop />
      <Page className="relative flex max-w-[88rem] flex-col pb-6 lg:h-[726px] lg:w-[1290px] lg:max-w-none lg:[zoom:max(0.8,min(tan(atan2(100cqw,1290px)),tan(atan2(100cqh,726px))))]">
        <section aria-labelledby="start-heading" className="shrink-0">
          <h1
            id="start-heading"
            className="mb-3 font-display text-xl tracking-tight"
          >
            Start creating
          </h1>
          <StartCreating />
        </section>

        <section aria-labelledby="recent-heading" className="mt-6 shrink-0">
          <div className="mb-3 flex items-end justify-between gap-4">
            <h2
              id="recent-heading"
              className="font-display text-xl tracking-tight"
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
            userId={userId}
            cloudTiles={cloudTiles}
            limit={RECENT}
          />
        </section>

        <div className="mt-6 grid grid-cols-1 gap-5 lg:min-h-56 lg:flex-1 lg:grid-cols-2">
          <PopularTemplates />
          <Tutorials />
        </div>
      </Page>
    </div>
  );
}
