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

export const ACTIVE_STATUSES: FeedbackStatus[] = [
  "open",
  "approved",
  "in_development",
];
export const FINISHED_STATUSES: FeedbackStatus[] = [
  "implemented",
  "declined",
  "closed",
];

export const TITLE_MAX = 100;
export const DESCRIPTION_MAX = 300;
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
  ago: string;
  createdAt: string;
  author: { name: string; username: string } | null;
  voted: boolean;
};

const isKind = (value: string): value is FeedbackKind =>
  Object.hasOwn(FEEDBACK_KINDS, value);

export function kindOf(
  value: string | null | undefined,
  fallback: FeedbackKind = "feature",
): FeedbackKind {
  return value && isKind(value) ? value : fallback;
}

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

export function pageFrom(from: string | null | undefined): string | null {
  if (!from || !from.startsWith("/") || from.startsWith("//")) return null;
  return from.slice(0, 300);
}

export function titlePattern(search: string): string | null {
  const text = search.trim().slice(0, TITLE_MAX);
  return text ? `%${text.replace(/[\\%_]/g, (c) => `\\${c}`)}%` : null;
}
