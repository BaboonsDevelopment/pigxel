"use client";

import { createPortal } from "react-dom";
import { cn } from "@pigxel/ui/lib/utils";
import { PixelImage } from "@/components/ui/pixel-image";
import { pixelifySans } from "@/lib/fonts/pixelify";
import type { DragState } from "./project-drag";

export function DragGhost({ drag }: { drag: DragState }) {
  const { projects, landing } = drag;
  const at = landing ?? { x: drag.x, y: drag.y };
  const count = projects.ids.length;
  return createPortal(
    <div
      aria-hidden="true"
      style={{ transform: `translate(${at.x}px, ${at.y}px)` }}
      className={cn(
        "pointer-events-none fixed top-0 left-0 z-[100]",
        landing && "transition-transform duration-250 ease-in",
      )}
    >
      <div
        className={cn(
          "-translate-x-1/2 -translate-y-1/2 transition-[scale,opacity,rotate] duration-250",
          landing ? "scale-20 rotate-0 opacity-0" : "scale-100 -rotate-6",
        )}
      >
        <div className="animate-in zoom-in-75 fade-in duration-150">
          <div className="relative w-28">
            {count > 1 && (
              <span className="absolute inset-0 translate-x-1.5 -translate-y-1.5 rotate-6 rounded-xl border-2 border-white bg-pastel-pink shadow-md" />
            )}
            <div className="relative overflow-hidden rounded-xl border-2 border-white bg-card shadow-[0_18px_40px_-12px_rgb(74_31_53/0.55)]">
              <span className="block aspect-square bg-checker">
                {projects.thumbnail && (
                  <PixelImage
                    src={projects.thumbnail}
                    alt=""
                    className="size-full object-cover"
                  />
                )}
              </span>
              <span
                className={cn(
                  pixelifySans.className,
                  "block truncate border-t px-2 py-1 text-[11px]",
                )}
              >
                {projects.name}
              </span>
            </div>
            {count > 1 && (
              <span
                className={cn(
                  pixelifySans.className,
                  "absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-md bg-primary text-xs text-primary-foreground shadow-md",
                )}
              >
                {count}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
