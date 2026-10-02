import type { SVGProps } from "react";

/** Line icons for the sidebar, drawn to one 24px grid and stroke. */
function Icon({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-5 shrink-0"
      {...props}
    >
      {children}
    </svg>
  );
}

export const HomeIcon = () => (
  <Icon>
    <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1Z" />
  </Icon>
);

export const FolderIcon = () => (
  <Icon>
    <path d="M3.5 7.5a2 2 0 0 1 2-2h3.8l2 2.2h7.2a2 2 0 0 1 2 2v7.8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2Z" />
    <path d="M3.5 10.5h17" />
  </Icon>
);

export const TelescopeIcon = () => (
  <Icon>
    <path d="m4.5 13.5 11-5.5 1.8 3.6-11 5.5Z" />
    <path d="m15.5 8 3-1.5 1.8 3.6-3 1.5M3 14.3l1.5-.8 1.8 3.6-1.5.8" />
    <path d="m11.5 14.5 2.5 6M11.5 14.5 9 20.5" />
  </Icon>
);

export const SparklesIcon = () => (
  <Icon>
    <path d="M10 4.5c.6 3.4 2.1 4.9 5.5 5.5-3.4.6-4.9 2.1-5.5 5.5-.6-3.4-2.1-4.9-5.5-5.5 3.4-.6 4.9-2.1 5.5-5.5Z" />
    <path d="M17.5 13.5c.3 1.6 1 2.3 2.5 2.5-1.5.3-2.2 1-2.5 2.5-.3-1.5-1-2.2-2.5-2.5 1.5-.2 2.2-.9 2.5-2.5ZM17 3.5v3M15.5 5h3" />
  </Icon>
);

export const CubeIcon = () => (
  <Icon>
    <path d="M12 3.5 19.5 7.7v8.6L12 20.5l-7.5-4.2V7.7Z" />
    <path d="M4.5 7.7 12 12l7.5-4.3M12 12v8.5" />
  </Icon>
);

export const BugIcon = () => (
  <Icon>
    <path d="M8.5 9.5a3.5 3.5 0 0 1 7 0v4.5a3.5 3.5 0 0 1-7 0Z" />
    <path d="M10 6.5 8.5 4.5M14 6.5l1.5-2M8.5 11.5H5M8.5 15l-3 1.5M15.5 11.5H19M15.5 15l3 1.5M12 10v7.5" />
  </Icon>
);

export const BookIcon = () => (
  <Icon>
    <path d="M12 6.5c-1.8-1.3-4.3-2-7.5-2v13c3.2 0 5.7.7 7.5 2 1.8-1.3 4.3-2 7.5-2v-13c-3.2 0-5.7.7-7.5 2Z" />
    <path d="M12 6.5v13" />
  </Icon>
);

export const ChevronRightIcon = () => (
  <Icon className="size-4 shrink-0">
    <path d="m9 6 6 6-6 6" />
  </Icon>
);

export const MenuIcon = () => (
  <Icon>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Icon>
);

export const SearchIcon = () => (
  <Icon>
    <circle cx="11" cy="11" r="6" />
    <path d="m15.5 15.5 4 4" />
  </Icon>
);

export const BellIcon = () => (
  <Icon>
    <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15Z" />
    <path d="M10 20.5a2.2 2.2 0 0 0 4 0" />
  </Icon>
);

export const UserIcon = () => (
  <Icon className="size-4 shrink-0">
    <circle cx="12" cy="8.5" r="3.5" />
    <path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" />
  </Icon>
);

export const SettingsIcon = () => (
  <Icon className="size-4 shrink-0">
    <circle cx="12" cy="12" r="3" />
    <path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6 18 18M6 18l1.4-1.4M16.6 7.4 18 6" />
  </Icon>
);

export const CrownIcon = () => (
  <Icon className="size-4 shrink-0">
    <path d="M4.5 17.5 3.5 8l5 4 3.5-6 3.5 6 5-4-1 9.5Z" />
    <path d="M5 20.5h14" />
  </Icon>
);

export const SignOutIcon = () => (
  <Icon className="size-4 shrink-0">
    <path d="M14 4.5H7a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h7" />
    <path d="M11 12h9m-3-3.5 3.5 3.5-3.5 3.5" />
  </Icon>
);

export const CloseIcon = () => (
  <Icon>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
);
