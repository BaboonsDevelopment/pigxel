export function HoverOverlay({
  label,
  force = false,
}: {
  label: string;
  force?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      data-force={force || undefined}
      className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-has-[:focus-visible]:opacity-100 data-force:opacity-100"
    >
      <span className="absolute inset-0 bg-[linear-gradient(rgb(255_255_255/0.28)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/0.28)_1px,transparent_1px)] bg-[size:14px_14px]" />
      {SPARKLES.map(([top, left, size], i) => (
        <span
          key={i}
          className="absolute rotate-12 bg-white/90 motion-safe:animate-pulse"
          style={{
            top,
            left,
            width: size,
            height: size,
            animationDelay: `${i * 180}ms`,
          }}
        />
      ))}
      <span className="absolute bottom-3 left-1/2 flex -translate-x-1/2 translate-y-1 items-center gap-1.5 rounded-full bg-[#fde8ef] py-1 pr-2.5 pl-3.5 font-mono text-xs text-foreground shadow-sm transition-transform duration-200 group-hover:translate-y-0">
        {label}
        <svg viewBox="0 0 16 16" className="size-3" fill="none">
          <path
            d="m6 3 5 5-5 5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <PixelHeart className="absolute -top-1.5 -right-1.5 w-3" />
      </span>
    </span>
  );
}

const SPARKLES: [string, string, number][] = [
  ["8%", "6%", 7],
  ["16%", "15%", 4],
  ["6%", "84%", 6],
  ["18%", "91%", 4],
  ["38%", "88%", 5],
  ["52%", "80%", 3],
  ["60%", "8%", 4],
];

function PixelHeart({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 7 6" className={className} shapeRendering="crispEdges">
      <path
        d="M1 0h2v1h1V0h2v1h1v2H6v1H5v1H4v1H3V5H2V4H1V3H0V1h1z"
        fill="#f3a3bb"
      />
    </svg>
  );
}
