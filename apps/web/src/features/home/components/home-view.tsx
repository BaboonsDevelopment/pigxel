import Link from "next/link";
import { Page } from "@pigxel/ui/components/page";
import {
  Heading,
  linkVariants,
  SectionHeader,
} from "@pigxel/ui/components/typography";
import type { CloudTileSummary } from "@/lib/pigxel-file/cloud";
import { PixelBackdrop } from "./pixel-backdrop";
import { PopularTemplates } from "./popular-templates";
import { RecentProjects } from "./recent-projects";
import { StartCreating } from "./start-creating";
import { Tutorials } from "./tutorials";

export const RECENT = 4;

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
          <Heading as="h1" id="start-heading" className="mb-3">
            Start creating
          </Heading>
          <StartCreating />
        </section>

        <section aria-labelledby="recent-heading" className="mt-6 shrink-0">
          <SectionHeader
            id="recent-heading"
            title="Recent projects"
            actions={
              <Link
                href="/tiles"
                className={linkVariants({ variant: "accent" })}
              >
                View all <span aria-hidden="true">→</span>
              </Link>
            }
          />
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
