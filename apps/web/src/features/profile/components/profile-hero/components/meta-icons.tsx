import type { ReactNode } from "react";

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3.5 shrink-0"
    >
      {children}
    </svg>
  );
}

export const PinIcon = () => (
  <Icon>
    <path d="M8 14s4.5-4.2 4.5-7.5a4.5 4.5 0 0 0-9 0C3.5 9.8 8 14 8 14Z" />
    <circle cx="8" cy="6.5" r="1.6" />
  </Icon>
);

export const CalendarIcon = () => (
  <Icon>
    <rect x="2.5" y="3.5" width="11" height="10" rx="1.5" />
    <path d="M2.5 6.5h11M5.5 2v3M10.5 2v3" />
  </Icon>
);

export const LinkIcon = () => (
  <Icon>
    <path d="M6.7 9.3a3 3 0 0 0 4.2 0l2-2a3 3 0 0 0-4.2-4.2l-.7.6" />
    <path d="M9.3 6.7a3 3 0 0 0-4.2 0l-2 2a3 3 0 0 0 4.2 4.2l.7-.6" />
  </Icon>
);

export const PencilIcon = () => (
  <Icon>
    <path d="M10.5 2.5 13.5 5.5 5.5 13.5H2.5v-3Z" />
    <path d="M9 4l3 3" />
  </Icon>
);

export const SparkleIcon = () => (
  <Icon>
    <path d="M8 2v3M8 11v3M2 8h3M11 8h3M4 4l1.8 1.8M10.2 10.2 12 12M12 4l-1.8 1.8M5.8 10.2 4 12" />
  </Icon>
);
