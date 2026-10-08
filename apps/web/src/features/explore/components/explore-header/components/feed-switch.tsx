import { cn } from "@pigxel/ui/lib/utils";
import { FEEDS, type Feed } from "../../../constants";

export function FeedSwitch({
  feed,
  onChange,
}: {
  feed: Feed;
  onChange: (feed: Feed) => void;
}) {
  const index = FEEDS.findIndex((f) => f.value === feed);
  return (
    <div
      role="group"
      aria-label="Feed"
      className="relative grid h-9 grid-cols-2 rounded-lg border bg-background p-0.5 text-xs"
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0.5 left-0.5 w-[calc(50%-2px)] rounded-md bg-pastel-pink transition-transform duration-300 ease-out motion-reduce:transition-none"
        style={{ transform: `translateX(${index * 100}%)` }}
      />
      {FEEDS.map((f) => (
        <button
          key={f.value}
          type="button"
          aria-pressed={f.value === feed}
          onClick={() => onChange(f.value)}
          className={cn(
            "relative cursor-pointer rounded-md px-4 transition-colors",
            f.value === feed
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
