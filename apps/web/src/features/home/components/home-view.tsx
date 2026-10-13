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
    <div className="relative xl:h-full xl:[container-type:size]">
      <PixelBackdrop />
      <Page className="relative flex max-w-[88rem] flex-col pb-6 xl:h-[726px] xl:w-[1290px] xl:max-w-none xl:[zoom:max(0.8,min(tan(atan2(100cqw,1290px)),tan(atan2(100cqh,726px))))]">
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

        <div className="mt-6 grid grid-cols-1 gap-5 xl:min-h-56 xl:flex-1 xl:grid-cols-2">
          <PopularTemplates />
          <Tutorials />
        </div>
      </Page>
    </div>
  );
}
