import type { SVGProps } from "react";
import { PIG } from "../pixel-art";
import { PIG_COLORS } from "./draw-script";

type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const PencilIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17v3Z" />
    <path d="m14.5 7.5 3 3" />
  </Icon>
);

export const EraserIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m7 20-3.3-3.3a1.5 1.5 0 0 1 0-2.1L13.6 4.7a1.5 1.5 0 0 1 2.1 0l4.6 4.6a1.5 1.5 0 0 1 0 2.1L11 20H7Z" />
    <path d="M20 20H11M9 9l6.5 6.5" />
  </Icon>
);

export const BucketIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m5 11 7-7 8 8-7 7a2 2 0 0 1-2.8 0L5 13.8A2 2 0 0 1 5 11Z" />
    <path d="M5 12h14.5M21 16.5c0 1.4-.9 2.5-2 2.5s-2-1.1-2-2.5c0-1.6 2-3.5 2-3.5s2 1.9 2 3.5Z" />
  </Icon>
);

export const MirrorIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 3v18" strokeDasharray="2 3" />
    <path d="M9 7 4 17h5V7ZM15 7l5 10h-5V7Z" />
  </Icon>
);

export const FramesIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="3" y="5" width="18" height="14" rx="2.5" />
    <path d="M8 5v14M16 5v14M3 10h2M3 14h2M19 10h2M19 14h2" />
  </Icon>
);

export const SparklesIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 3.5 13.8 9a2 2 0 0 0 1.2 1.2l5.5 1.8-5.5 1.8a2 2 0 0 0-1.2 1.2L12 20.5 10.2 15a2 2 0 0 0-1.2-1.2L3.5 12 9 10.2A2 2 0 0 0 10.2 9L12 3.5Z" />
    <path d="M19 3v4M17 5h4" />
  </Icon>
);

export const ExportIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 15V3m0 0L7.5 7.5M12 3l4.5 4.5" />
    <path d="M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
  </Icon>
);

export const PlayIcon = (props: IconProps) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path d="M8 5.5v13l10.5-6.5L8 5.5Z" fill="currentColor" />
  </svg>
);

export const PauseIcon = (props: IconProps) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor" />
  </svg>
);

export const SendIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 19V5m0 0-6 6m6-6 6 6" />
  </Icon>
);

export const EyeIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12Z" />
    <circle cx="12" cy="12" r="2.6" fill="currentColor" stroke="none" />
  </Icon>
);

/** The pointer the "you" cursor shows, as in the hero. */
export const CursorArrow = (props: IconProps) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path d="M4 2.8 19.2 13l-6.9 1.5-3.6 6.7Z" strokeLinejoin="round" />
  </svg>
);

/** The pig as crisp vector pixels, for small previews. */
export function PigPixels(props: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      aria-hidden="true"
      {...props}
    >
      {PIG.flatMap((row, y) =>
        [...row].map((key, x) =>
          key in PIG_COLORS ? (
            <rect
              key={`${x}-${y}`}
              x={x}
              y={y}
              width="1"
              height="1"
              fill={PIG_COLORS[key as keyof typeof PIG_COLORS]}
            />
          ) : null,
        ),
      )}
    </svg>
  );
}
