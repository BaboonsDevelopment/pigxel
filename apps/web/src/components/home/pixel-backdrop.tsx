/**
 * Pale pixels scattered behind Home, some drifting gently. Positions are
 * fixed so the server and the browser draw the same thing.
 */
const PIXELS: {
  top: string;
  left: string;
  size: number;
  shade: string;
  drift?: boolean;
}[] = [
  { top: "4%", left: "38%", size: 8, shade: "#f1d3de", drift: true },
  { top: "6%", left: "40%", size: 6, shade: "#f6e1e8" },
  { top: "11%", left: "22%", size: 9, shade: "#ecdce3" },
  { top: "14%", left: "71%", size: 8, shade: "#ecdce3", drift: true },
  { top: "12%", left: "86%", size: 5, shade: "#f1d3de" },
  { top: "44%", left: "21%", size: 11, shade: "#ecdce3" },
  { top: "51%", left: "72%", size: 7, shade: "#f1d3de", drift: true },
  { top: "53%", left: "84%", size: 8, shade: "#e9dbe3" },
  { top: "55%", left: "38%", size: 10, shade: "#f4dde6", drift: true },
  { top: "57%", left: "52%", size: 6, shade: "#ecdce3" },
  { top: "90%", left: "18%", size: 9, shade: "#ecdce3" },
  { top: "92%", left: "43%", size: 7, shade: "#f1d3de", drift: true },
  { top: "93%", left: "51%", size: 11, shade: "#f6e1e8" },
  { top: "95%", left: "96%", size: 12, shade: "#ecdce3" },
];

export function PixelBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {PIXELS.map((pixel, i) => (
        <span
          key={i}
          className={
            pixel.drift
              ? "absolute motion-safe:animate-[pixel-drift_7s_ease-in-out_infinite]"
              : "absolute"
          }
          style={{
            top: pixel.top,
            left: pixel.left,
            width: pixel.size,
            height: pixel.size,
            background: pixel.shade,
            animationDelay: `${i * -0.6}s`,
          }}
        />
      ))}
    </div>
  );
}
