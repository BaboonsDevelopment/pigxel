export type MenuItem = {
  label: string;
  shortcut?: string;
  onSelect: () => void;
  hidden?: boolean;
  disabled?: boolean;
};

/** A menu's items in groups, divided by a line. */
export type MenuSections = MenuItem[][];
