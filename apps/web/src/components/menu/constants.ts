export type MenuItem = {
  label: string;
  shortcut?: string;
  hidden?: boolean;
  disabled?: boolean;
} & (
  | { onSelect: () => void; submenu?: never }
  /** Opens to the side with more items, e.g. Transform ▸ Flip, Rotate. */
  | { submenu: MenuSections; onSelect?: never }
);

/** A menu's items in groups, divided by a line. */
export type MenuSections = MenuItem[][];
