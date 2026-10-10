import type { ReactNode } from "react";

export type MenuItem = {
  label: string;
  icon?: ReactNode;
  shortcut?: string;
  hidden?: boolean;
  disabled?: boolean;
} & (
  | { onSelect: () => void; submenu?: never }
  | { submenu: MenuSections; onSelect?: never }
);

export type MenuSections = MenuItem[][];
