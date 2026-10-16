import type { ReactNode } from "react";
import type { Filter } from "../constants";

function Icon({ children }: { children: ReactNode }) {
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
      {children}
    </svg>
  );
}

export function SortIcon() {
  return (
    <Icon>
      <path d="M4 13V3M2 5l2-2 2 2M8.5 4h5M8.5 7h4M8.5 10h3M8.5 13h2" />
    </Icon>
  );
}

export function FilterIcon() {
  return (
    <Icon>
      <path d="M2.5 4.5h6M12 4.5h1.5M2.5 11.5h1.5M7.5 11.5h6" />
      <circle cx="10.2" cy="4.5" r="1.7" />
      <circle cx="5.8" cy="11.5" r="1.7" />
    </Icon>
  );
}

export const CATEGORY_ICONS: Record<Filter, ReactNode> = {
  All: (
    <Icon>
      <rect x="2.5" y="2.5" width="11" height="11" rx="1.5" />
      <path d="M2.5 6.2h11M2.5 9.8h11M6.2 2.5v11M9.8 2.5v11" />
    </Icon>
  ),
  Projects: (
    <Icon>
      <path d="M4 1.8h5.2L12.5 5v8.2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2.8a1 1 0 0 1 1-1Z" />
      <path d="M9 1.8V5h3.5" />
    </Icon>
  ),
  Folders: (
    <Icon>
      <path d="M1.8 4a1 1 0 0 1 1-1h3.4l1.5 1.6h5.5a1 1 0 0 1 1 1v6.6a1 1 0 0 1-1 1H2.8a1 1 0 0 1-1-1Z" />
    </Icon>
  ),
  Shared: (
    <Icon>
      <circle cx="6" cy="5.5" r="2.3" />
      <path d="M1.8 13.5c.3-2.3 2-3.8 4.2-3.8s3.9 1.5 4.2 3.8M10.5 3.4a2.3 2.3 0 0 1 0 4.3M12 9.9c1.2.5 2 1.8 2.2 3.6" />
    </Icon>
  ),
  Favourite: (
    <Icon>
      <path d="m8 2 1.8 3.7 4 .6-2.9 2.8.7 4L8 11.2l-3.6 1.9.7-4-2.9-2.8 4-.6Z" />
    </Icon>
  ),
  Archive: (
    <Icon>
      <rect x="2" y="2.5" width="12" height="3.2" rx="0.8" />
      <path d="M2.8 5.7v6.8a1 1 0 0 0 1 1h8.4a1 1 0 0 0 1-1V5.7M6.5 8.5h3" />
    </Icon>
  ),
};
