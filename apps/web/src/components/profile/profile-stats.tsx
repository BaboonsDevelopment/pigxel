import { cn } from "@pigxel/ui/lib/utils";
import type { ProfileActivity } from "@/lib/profile/server";

const DAY = 86_400_000;
const WEEKS = 53;

const LEVELS = [
  "bg-[#f3e8ee]",
  "bg-[#f6c9d8]",
  "bg-[#eb9dba]",
  "bg-[#d8709b]",
  "bg-[#a9487a]",
];
const level = (arts: number) =>
  arts === 0 ? 0 : arts === 1 ? 1 : arts === 2 ? 2 : arts <= 4 ? 3 : 4;

const iso = (time: number) => new Date(time).toISOString().slice(0, 10);
const shortDate = (time: number) =>
  new Date(time).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

export function ProfileStats({
  activity,
  artCount,
  publishedCount,
}: {
  activity: ProfileActivity;
  artCount: number;
  publishedCount?: number;
}) {
  return (
    <section
      aria-label="Activity"
      className="mt-10 grid gap-5 lg:grid-cols-[minmax(0,1fr)_15rem]"
    >
      <ActivityCard activity={activity} />
      <div className="flex flex-col justify-between gap-6 rounded-2xl border bg-linear-160 from-[#fff4f7] to-[#fbe4ec] p-5 lg:aspect-square">
        <span
          aria-hidden="true"
          className="flex size-11 items-center justify-center rounded-xl bg-primary text-white shadow-[0_6px_16px_-8px_var(--color-primary)]"
        >
          <FrameIcon />
        </span>
        <div>
          <p className="text-sm text-muted-foreground">Total arts</p>
          <p className="mt-1 font-display text-5xl tracking-tight tabular-nums">
            {artCount}
          </p>
          {publishedCount !== undefined && (
            <p className="mt-1 text-xs text-muted-foreground">
              <span className="font-semibold text-success tabular-nums">
                {publishedCount}
              </span>{" "}
              published
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function ActivityCard({
  activity: { days: activity, today },
}: {
  activity: ProfileActivity;
}) {
  const start = today - ((WEEKS - 1) * 7 + new Date(today).getUTCDay()) * DAY;
  const weeks = Array.from({ length: WEEKS }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => start + (w * 7 + d) * DAY),
  );

  let total = 0;
  let activeDays = 0;
  for (let t = start; t <= today; t += DAY) {
    const arts = activity.get(iso(t)) ?? 0;
    total += arts;
    if (arts > 0) activeDays++;
  }
  let streak = 0;
  for (
    let t = activity.has(iso(today)) ? today : today - DAY;
    activity.has(iso(t));
    t -= DAY
  )
    streak++;

  const months = weeks.map((days, w) => {
    const first = days.find((t) => new Date(t).getUTCDate() === 1);
    return first !== undefined && w > 0
      ? new Date(first).toLocaleDateString("en-US", {
          month: "short",
          timeZone: "UTC",
        })
      : "";
  });

  return (
    <div className="min-w-0 rounded-2xl border bg-card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 className="font-display text-xl tracking-tight">Daily activity</h2>
        <p className="text-xs text-muted-foreground">
          <Stat value={total} label={total === 1 ? "art" : "arts"} /> in the
          last year · <Stat value={activeDays} label="active days" /> ·{" "}
          <Stat value={streak} label="day streak" />
        </p>
      </div>

      <div className="mt-5 overflow-x-auto pb-1 [direction:rtl]">
        <div
          role="img"
          aria-label={`${total} arts worked on over ${activeDays} days in the last year; current streak ${streak} days.`}
          className="flex w-max gap-2 [direction:ltr]"
        >
          <div
            aria-hidden="true"
            className="mt-5 grid grid-rows-7 gap-[3px] text-[10px] leading-3 text-muted-foreground"
          >
            {["", "Mon", "", "Wed", "", "Fri", ""].map((day, i) => (
              <span key={i} className="h-3">
                {day}
              </span>
            ))}
          </div>
          <div aria-hidden="true">
            <div className="flex h-5 gap-[3px] text-[10px] text-muted-foreground">
              {months.map((month, w) => (
                <span
                  key={w}
                  className="w-3 overflow-visible whitespace-nowrap"
                >
                  {month}
                </span>
              ))}
            </div>
            <div className="flex gap-[3px]">
              {weeks.map((days, w) => (
                <div key={w} className="grid grid-rows-7 gap-[3px]">
                  {days.map((t) =>
                    t > today ? (
                      <span key={t} className="size-3" />
                    ) : (
                      <DayCell
                        key={t}
                        time={t}
                        arts={activity.get(iso(t)) ?? 0}
                      />
                    ),
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div
        aria-hidden="true"
        className="mt-3 flex items-center justify-end gap-1 text-[10px] text-muted-foreground"
      >
        Less
        {LEVELS.map((shade) => (
          <span key={shade} className={cn("size-3 rounded-[2px]", shade)} />
        ))}
        More
      </div>
    </div>
  );
}

function DayCell({ time, arts }: { time: number; arts: number }) {
  return (
    <span
      title={`${arts === 0 ? "No" : arts} ${arts === 1 ? "art" : "arts"} on ${shortDate(time)}`}
      className={cn("size-3 rounded-[2px]", LEVELS[level(arts)])}
    />
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <>
      <span className="font-semibold text-foreground tabular-nums">
        {value}
      </span>{" "}
      {label}
    </>
  );
}

function FrameIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="size-5"
      fill="currentColor"
      shapeRendering="crispEdges"
    >
      <path d="M2 2h12v12H2zm2 2v8h8V4z" />
      <path d="M5 10h2V8h1v1h1V7h1v1h1v2H5z" />
      <path d="M5 5h2v2H5z" />
    </svg>
  );
}
