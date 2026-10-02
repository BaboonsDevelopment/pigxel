/**
 * The feedback board: bug reports and feature requests everyone signed in
 * can see and vote for, like issues on GitHub. The team moves each one on
 * from "open"; until then, it counts towards its author's limit.
 */

export const FEEDBACK_KINDS = {
  bug: { label: "Bugs", one: "bug report", new: "Report a bug" },
  feature: {
    label: "Feature requests",
    one: "feature request",
    new: "Request a feature",
  },
} as const;
export type FeedbackKind = keyof typeof FEEDBACK_KINDS;

export const FEEDBACK_STATUSES = {
  open: "Open",
  approved: "Approved",
  in_development: "In development",
  implemented: "Implemented",
  declined: "Declined",
  closed: "Closed",
} as const;
export type FeedbackStatus = keyof typeof FEEDBACK_STATUSES;

/** Still being worked out: shown under Open, and open to votes. */
export const ACTIVE_STATUSES: FeedbackStatus[] = [
  "open",
  "approved",
  "in_development",
];
/** Done with, one way or another: shown under Closed. */
export const FINISHED_STATUSES: FeedbackStatus[] = [
  "implemented",
  "declined",
  "closed",
];

export const TITLE_MAX = 100;
export const DESCRIPTION_MAX = 300;
/** Open reports of each kind one person can have before the team moves one on. */
export const OPEN_LIMIT = 3;

export type FeedbackInput = {
  kind: FeedbackKind;
  title: string;
  description: string;
};

export type FeedbackItem = FeedbackInput & {
  id: number;
  status: FeedbackStatus;
  votes: number;
  /** "3 days ago". */
  ago: string;
  createdAt: string;
  /** Who sent it; null when their profile is private. */
  author: { name: string; username: string } | null;
  /** Whether the person looking voted for it. */
  voted: boolean;
};

const isKind = (value: string): value is FeedbackKind =>
  Object.hasOwn(FEEDBACK_KINDS, value);

/** `value` as a kind, or the default when it isn't one. */
export function kindOf(
  value: string | null | undefined,
  fallback: FeedbackKind = "feature",
): FeedbackKind {
  return value && isKind(value) ? value : fallback;
}

/** The report as typed, checked; or what's wrong and in which field. */
export function readFeedback(raw: {
  kind: string;
  title: string;
  description: string;
}):
  | { value: FeedbackInput }
  | { error: string; field: "kind" | "title" | "description" } {
  if (!isKind(raw.kind))
    return { field: "kind", error: "Choose a bug or a feature request." };
  const title = raw.title.replace(/\s+/g, " ").trim();
  if (!title || title.length > TITLE_MAX)
    return {
      field: "title",
      error: `Give it a title of 1–${TITLE_MAX} characters.`,
    };
  // Line breaks are kept; it's plain text.
  const description = raw.description.replace(/\r\n/g, "\n").trim();
  if (!description)
    return {
      field: "description",
      error:
        raw.kind === "bug"
          ? "Tell us what happened."
          : "Tell us what you’d like to do.",
    };
  if (description.length > DESCRIPTION_MAX)
    return {
      field: "description",
      error: `Keep it to ${DESCRIPTION_MAX} characters.`,
    };
  return { value: { kind: raw.kind, title, description } };
}

/**
 * The page a report was sent from, from the link that opened the form: a
 * path on this site, or nothing.
 */
export function pageFrom(from: string | null | undefined): string | null {
  if (!from || !from.startsWith("/") || from.startsWith("//")) return null;
  return from.slice(0, 300);
}

/** Text to look for in titles, as a LIKE pattern matching it literally. */
export function titlePattern(search: string): string | null {
  const text = search.trim().slice(0, TITLE_MAX);
  return text ? `%${text.replace(/[\\%_]/g, (c) => `\\${c}`)}%` : null;
}
