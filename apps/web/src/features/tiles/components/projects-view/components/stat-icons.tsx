import type { ReactNode } from "react";
import type { StatKey } from "../../../stats";

export const STATS: Record<StatKey, { label: string; icon: ReactNode }> = {
  views: {
    label: "Views",
    icon: (
      <>
        <path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8Z" />
        <circle cx="8" cy="8" r="2" />
      </>
    ),
  },
  likes: {
    label: "Likes",
    icon: (
      <path d="M8 13.5s-5.5-3.3-5.5-7.2A3 3 0 0 1 8 4.6a3 3 0 0 1 5.5 1.7c0 3.9-5.5 7.2-5.5 7.2Z" />
    ),
  },
  downloads: {
    label: "Downloads",
    icon: (
      <path d="M8 2v8.5M4.5 7 8 10.5 11.5 7M2 10.5V12a1.5 1.5 0 0 0 1.5 1.5h9A1.5 1.5 0 0 0 14 12v-1.5" />
    ),
  },
  comments: {
    label: "Comments",
    icon: (
      <path d="M2.5 4a1.5 1.5 0 0 1 1.5-1.5h8A1.5 1.5 0 0 1 13.5 4v5.5A1.5 1.5 0 0 1 12 11H7l-3 2.5V11a1.5 1.5 0 0 1-1.5-1.5Z" />
    ),
  },
};

export function StatIcon({ stat }: { stat: StatKey }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4 shrink-0"
    >
      {STATS[stat].icon}
    </svg>
  );
}
