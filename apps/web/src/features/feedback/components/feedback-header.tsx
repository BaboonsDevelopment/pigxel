import Link from "next/link";
import { buttonVariants } from "@pigxel/ui/components/button";
import { PageHeader } from "@pigxel/ui/components/typography";
import { TabLinks } from "@/components/ui/tab-links";
import { boardUrl, FEEDBACK_KINDS, type FeedbackKind } from "../feedback";

export const ROADMAP_PATH = "/feedback/roadmap";

/** The Feedback title, its new-report buttons, and Bugs / Features / Roadmap. */
export function FeedbackHeader({
  active,
  from,
  kindHref = (kind) =>
    boardUrl({ kind, state: "open", sort: "votes", search: "" }),
}: {
  active: FeedbackKind | "roadmap";
  /** The page people came from, to return to after reporting. */
  from: string | null;
  kindHref?: (kind: FeedbackKind) => string;
}) {
  const newUrl = (kind: FeedbackKind) =>
    `/feedback/new?kind=${kind}${from ? `&from=${encodeURIComponent(from)}` : ""}`;
  return (
    <>
      <PageHeader
        title="Feedback"
        description="Vote for what you’d like next, or tell us what’s broken. The team reads every report and moves it along as it’s looked at."
        actions={
          <div className="flex gap-2">
            <Link
              href={newUrl("bug")}
              className={buttonVariants({ variant: "secondary" })}
            >
              Report a bug
            </Link>
            <Link href={newUrl("feature")} className={buttonVariants()}>
              Request a feature
            </Link>
          </div>
        }
      />
      <TabLinks
        label="Feedback"
        className="mt-6"
        tabs={[
          ...(Object.keys(FEEDBACK_KINDS) as FeedbackKind[]).map((kind) => ({
            href: kindHref(kind),
            label: FEEDBACK_KINDS[kind].label,
            active: kind === active,
          })),
          {
            href: ROADMAP_PATH,
            label: "Roadmap",
            active: active === "roadmap",
          },
        ]}
      />
    </>
  );
}
