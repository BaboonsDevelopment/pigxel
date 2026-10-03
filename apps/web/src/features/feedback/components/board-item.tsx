import Link from "next/link";
import { Badge, type BadgeTone } from "@pigxel/ui/components/badge";
import { Text } from "@pigxel/ui/components/typography";
import {
  ACTIVE_STATUSES,
  FEEDBACK_STATUSES,
  type FeedbackItem,
  type FeedbackStatus,
} from "../feedback";
import { VoteButton } from "./vote-button";

export function BoardItem({ item }: { item: FeedbackItem }) {
  return (
    <li id={`feedback-${item.id}`} className="flex gap-4 px-4 py-4">
      <VoteButton
        id={item.id}
        title={item.title}
        votes={item.votes}
        voted={item.voted}
        open={ACTIVE_STATUSES.includes(item.status)}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start gap-x-2 gap-y-1">
          <h3 className="min-w-0 font-semibold break-words">{item.title}</h3>
          <StatusBadge status={item.status} />
        </div>
        <p className="mt-1 text-sm break-words whitespace-pre-line text-foreground/80">
          {item.description}
        </p>
        <Text size="xs" tone="muted" className="mt-2">
          #{item.id} opened <time dateTime={item.createdAt}>{item.ago}</time> by{" "}
          {item.author ? (
            <Link
              href={`/u/${item.author.username}`}
              className="font-medium text-foreground hover:underline"
            >
              @{item.author.username}
            </Link>
          ) : (
            "a Pigxel artist"
          )}
        </Text>
      </div>
    </li>
  );
}

const STATUS_TONES: Record<FeedbackStatus, BadgeTone> = {
  open: "open",
  approved: "lavender",
  in_development: "pink",
  implemented: "success",
  declined: "muted",
  closed: "muted",
};

function StatusBadge({ status }: { status: FeedbackStatus }) {
  return (
    <Badge tone={STATUS_TONES[status]} size="md">
      {FEEDBACK_STATUSES[status]}
    </Badge>
  );
}
