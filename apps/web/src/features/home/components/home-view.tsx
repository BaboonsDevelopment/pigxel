import { Page } from "@pigxel/ui/components/page";
import { Heading, SectionHeader } from "@pigxel/ui/components/typography";
import type { PublicTile } from "@/features/profile/profile";
import type { CloudTileSummary } from "@/lib/pigxel-file/cloud";
import { PixelBackdrop } from "./pixel-backdrop";
import { RecentProjects } from "./recent-projects";
import { StartCreating } from "./start-creating";
import { TrendingWorks } from "./trending-works";
import { Tutorials } from "./tutorials";
import { ViewAllLink } from "./view-all-link";

export const RECENT = 4;

export function HomeView({
  userId,
  cloudTiles,
  aiAllowed,
  tutorials,
  trending,
}: {
  userId: string;
  cloudTiles: CloudTileSummary[];
  /** Whether the plan includes the AI helper. */
  aiAllowed: boolean;
  tutorials: { premium: boolean; finished: string[] };
  /** Null when they couldn't be loaded. */
  trending: PublicTile[] | null;
}) {
  return (
    <div className="relative lg:h-full lg:[container-type:size]">
      <PixelBackdrop />
      {/* Scaled to fit the screen. A screen wider than the design widens the
          layout (up to a cap) instead of leaving gaps at the sides. */}
      <Page className="relative flex max-w-[88rem] flex-col pb-6 lg:h-[820px] lg:w-[min(1560px,max(1290px,calc(100cqw/var(--zoom))))] lg:max-w-none lg:[--zoom:max(0.6,min(tan(atan2(100cqw,1290px)),tan(atan2(100cqh,820px))))] lg:[zoom:var(--zoom)]">
        <section aria-labelledby="start-heading" className="shrink-0">
          <Heading as="h1" id="start-heading" className="mb-3">
            Start creating
          </Heading>
          <StartCreating userId={userId} aiAllowed={aiAllowed} />
        </section>

        <section aria-labelledby="recent-heading" className="mt-6 shrink-0">
          <SectionHeader
            id="recent-heading"
            title="Recent projects"
            actions={<ViewAllLink href="/tiles" />}
          />
          <RecentProjects
            userId={userId}
            cloudTiles={cloudTiles}
            limit={RECENT}
          />
        </section>

        <div className="mt-6 grid grid-cols-1 gap-5 lg:min-h-56 lg:flex-1 lg:grid-cols-2">
          <TrendingWorks works={trending} />
          <Tutorials {...tutorials} />
        </div>
      </Page>
    </div>
  );
}
