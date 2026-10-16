import type { ReactNode } from "react";

function Icon({
  children,
  className = "size-4",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {children}
    </svg>
  );
}

export const StarIcon = () => (
  <Icon>
    <path d="m10 2.8 2.2 4.5 4.9.7-3.6 3.5.9 4.9L10 14.1l-4.4 2.3.9-4.9L2.9 8l4.9-.7Z" />
  </Icon>
);

export const ClockIcon = () => (
  <Icon>
    <circle cx="10" cy="10" r="7" />
    <path d="M10 6v4l2.5 2" />
  </Icon>
);

export const HeartIcon = () => (
  <Icon>
    <path d="M10 16.5S3 12.4 3 7.6A3.6 3.6 0 0 1 10 6a3.6 3.6 0 0 1 7 1.6c0 4.8-7 8.9-7 8.9Z" />
  </Icon>
);

export const SortAzIcon = () => (
  <Icon>
    <path d="M5 3v14M2.5 14.5 5 17l2.5-2.5M11 8l2-5 2 5M11.6 6.5h2.8M11 11.5h4l-4 5.5h4" />
  </Icon>
);

export const CalendarIcon = () => (
  <Icon>
    <rect x="3" y="4.5" width="14" height="12.5" rx="2" />
    <path d="M3 8.5h14M7 2.5v4M13 2.5v4M7 11.5h1M11.5 11.5h1M7 14h1" />
  </Icon>
);

export const FiltersIcon = () => (
  <Icon>
    <path d="M3 6h8M15 6h2M3 14h2M9 14h8" />
    <circle cx="13" cy="6" r="2" />
    <circle cx="7" cy="14" r="2" />
  </Icon>
);

export const ChevronIcon = () => (
  <Icon className="size-3.5">
    <path d="m6 8 4 4 4-4" />
  </Icon>
);

export const CheckIcon = () => (
  <Icon className="size-4">
    <path d="m4.5 10.5 3.5 3.5 7.5-8" />
  </Icon>
);

export const SearchIcon = () => (
  <Icon>
    <circle cx="9" cy="9" r="5.5" />
    <path d="m13 13 3.5 3.5" />
  </Icon>
);

export const CloseIcon = () => (
  <Icon className="size-3">
    <path d="m5 5 10 10M15 5 5 15" />
  </Icon>
);
