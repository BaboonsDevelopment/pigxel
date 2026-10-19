import Link from "next/link";
import { Card } from "@pigxel/ui/components/card";
import {
  SectionTitle,
  Text,
  textLinkClassName,
} from "@pigxel/ui/components/typography";
import { limitsOf, type PlanName } from "../pricing";
import type { SubscriptionUsage as Usage } from "../usage";

const number = (value: number) => Math.round(value).toLocaleString("en-US");

export function SubscriptionUsage({
  plan,
  usage,
}: {
  plan: PlanName;
  usage: Usage;
}) {
  const limits = limitsOf(plan);
  return (
    <section aria-labelledby="subscription-usage-heading" className="mt-8">
      <SectionTitle id="subscription-usage-heading">Your usage</SectionTitle>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Card>
          <Text tone="muted">Pigxel cloud projects</Text>
          <UsageMeter
            used={usage.cloudProjects}
            limit={limits.cloudTiles}
            label="Cloud projects used"
          />
          <Text tone="muted" className="mt-2">
            {usage.cloudProjects === null
              ? "Couldn’t load your cloud usage. Refresh to try again."
              : usage.cloudProjects > limits.cloudTiles
                ? "You’re above your current limit. Your existing work is safe; free up space to save new projects."
                : `${number(Math.max(0, limits.cloudTiles - usage.cloudProjects))} projects remaining. Projects in Trash don’t count.`}
          </Text>
          <Link
            href="/tiles"
            className={`${textLinkClassName} mt-3 inline-block text-sm`}
          >
            Manage projects
          </Link>
        </Card>
        <Card>
          <Text tone="muted">Monthly AI tokens</Text>
          <UsageMeter
            used={usage.ai?.spent ?? null}
            limit={limits.aiTokens}
            label="AI tokens used"
          />
          <Text tone="muted" className="mt-2">
            {!usage.ai
              ? "Couldn’t load your AI usage. Refresh to try again."
              : limits.aiTokens === 0
                ? "Your plan doesn’t include AI tools. All drawing tools are included."
                : `${number(usage.ai.left)} tokens remaining.${usage.ai.resetsAt ? ` Resets ${new Date(usage.ai.resetsAt).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })} (UTC).` : ""}`}
          </Text>
        </Card>
      </div>
    </section>
  );
}

function UsageMeter({
  used,
  limit,
  label,
}: {
  used: number | null;
  limit: number;
  label: string;
}) {
  return (
    <>
      <p className="mt-2 text-xl font-semibold tabular-nums">
        {used === null ? "—" : number(used)}{" "}
        <span className="text-sm font-normal text-muted-foreground">
          / {number(limit)}
        </span>
      </p>
      {used !== null && limit > 0 && (
        <progress
          aria-label={label}
          value={Math.min(used, limit)}
          max={limit}
          className="mt-3 h-2 w-full overflow-hidden rounded-full accent-primary"
        />
      )}
    </>
  );
}
