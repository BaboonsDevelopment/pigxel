import type { ComponentProps } from "react";
import { cn } from "@pigxel/ui/lib/utils";

export function PixelImage({
  className,
  alt,
  ...props
}: ComponentProps<"img">) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- pixel art is kept crisp at its own size, which next/image would resample
    <img
      alt={alt}
      decoding="async"
      className={cn("[image-rendering:pixelated]", className)}
      {...props}
    />
  );
}
