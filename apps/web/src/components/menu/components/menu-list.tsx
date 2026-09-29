import type { MenuSections } from "../constants";

/** The items of a menu, group by group; picking one calls `onDone` first. */
export function MenuList({
  sections,
  onDone,
}: {
  sections: MenuSections;
  onDone: () => void;
}) {
  return sections
    .map((items) => items.filter((item) => !item.hidden))
    .filter((items) => items.length > 0)
    .map((items, index) => (
      <div
        key={index}
        role="group"
        className="border-t py-1 first:border-t-0 first:pt-0 last:pb-0"
      >
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            role="menuitem"
            disabled={item.disabled}
            className="flex w-full items-center justify-between gap-6 rounded-md px-3 py-2 text-left text-sm hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
            onClick={() => {
              onDone();
              item.onSelect();
            }}
          >
            {item.label}
            {item.shortcut && (
              <kbd className="font-sans text-xs text-muted-foreground">
                {item.shortcut}
              </kbd>
            )}
          </button>
        ))}
      </div>
    ));
}
