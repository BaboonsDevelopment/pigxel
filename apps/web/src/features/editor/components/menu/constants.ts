export type MenuItem = {
  label: string;
  shortcut?: string;
  hidden?: boolean;
  disabled?: boolean;
} & (
  | { onSelect: () => void; submenu?: never }
  | { submenu: MenuSections; onSelect?: never }
);

export type MenuSections = MenuItem[][];
