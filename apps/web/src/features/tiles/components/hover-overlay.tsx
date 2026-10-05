import type { CSSProperties } from "react";
import { cn } from "@pigxel/ui/lib/utils";
import { pixelifySans } from "@/lib/fonts/pixelify";

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
      <span className="absolute inset-0 bg-[#4a1f35]/25" />
      <span className="absolute inset-0 bg-[linear-gradient(rgb(255_255_255/0.45)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/0.45)_1px,transparent_1px)] bg-[size:18px_18px]" />
      {SPARKLES.map((sparkle, i) => (
        <Sparkle key={i} {...sparkle} />
      ))}
      <span
        className={cn(
          pixelifySans.className,
          "absolute bottom-3.5 left-1/2 flex -translate-x-1/2 translate-y-1 rounded-[7px] border-[1.5px] border-[#fde7ef] bg-[#fffcfd] px-2.5 py-[7px] text-[11px] leading-[13px] whitespace-nowrap text-foreground transition-transform duration-200 group-hover:translate-y-0",
        )}
      >
        {label} →
        <Sparkle top="-7px" right="22px" size={8} rotate={-18} />
        <Sparkle top="-9px" right="10px" size={10} rotate={32} />
      </span>
    </span>
  );
}

type SparkleProps = {
  top: string;
  left?: string;
  right?: string;
  size: number;
  rotate: number;
};

const SPARKLES: SparkleProps[] = [
  { top: "7%", left: "4%", size: 11, rotate: 20 },
  { top: "11%", left: "13%", size: 6, rotate: -12 },
  { top: "18%", left: "5%", size: 8, rotate: 35 },
  { top: "9%", left: "90%", size: 10, rotate: 30 },
  { top: "21%", left: "85%", size: 9, rotate: 14 },
  { top: "28%", left: "90%", size: 7, rotate: 45 },
  { top: "70%", left: "88%", size: 11, rotate: 8 },
  { top: "83%", left: "80%", size: 12, rotate: -14 },
];

function Sparkle({ top, left, right, size, rotate }: SparkleProps) {
  const style: CSSProperties = {
    top,
    left,
    right,
    width: size,
    height: size,
    transform: `rotate(${rotate}deg)`,
    background: "radial-gradient(circle, #f7b8ce 0%, #fde3ec 40%, #ffffff 75%)",
    boxShadow: "inset 0 0 0 0.7px #f7b8ce",
  };
  return <span className="absolute" style={style} />;
}
