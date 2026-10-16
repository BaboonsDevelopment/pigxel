"use client";

import type { ReactNode } from "react";
import { cn } from "@pigxel/ui/lib/utils";
import type { MenuSections } from "../menu/constants";
import { Menu } from "../menu/menu";

const BUTTON =
  "grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground aria-pressed:bg-[#fde2ea] aria-pressed:text-foreground";

/** The buttons floating at the canvas's top right. */
export function CanvasControls({
  pixelGrid,
  onPixelGrid,
  onFullScreen,
  viewSettings,
  children,
}: {
  pixelGrid: boolean;
  onPixelGrid: () => void;
  onFullScreen: () => void;
  /** Grid, onion skin and preview options, as in the View menu. */
  viewSettings: MenuSections;
  /** More buttons after these, e.g. reopening the sidebar. */
  children?: ReactNode;
}) {
  return (
    <div className="absolute top-3 right-3 z-20 flex items-center gap-0.5 rounded-lg border bg-background/95 p-0.5 shadow-sm">
      <button
        type="button"
        aria-pressed={pixelGrid}
        aria-label="Pixel grid"
        title="Pixel grid"
        onClick={onPixelGrid}
        className={BUTTON}
      >
        <Icon>
          <rect x="2.5" y="2.5" width="11" height="11" rx="1" />
          <path d="M6.2 2.5v11M9.8 2.5v11M2.5 6.2h11M2.5 9.8h11" />
        </Icon>
      </button>
      <button
        type="button"
        aria-label="Full screen"
        title="Full screen"
        onClick={onFullScreen}
        className={BUTTON}
      >
        <Icon>
          <path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10" />
        </Icon>
      </button>
      <Menu
        label="View settings"
        align="right"
        sections={viewSettings}
        icon={
          <Icon>
            <path d="M2.5 4.5h7M12.5 4.5h1M2.5 11.5h1M6.5 11.5h7" />
            <circle cx="11" cy="4.5" r="1.5" />
            <circle cx="5" cy="11.5" r="1.5" />
          </Icon>
        }
      />
      {children}
    </div>
  );
}

function Icon({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-4", className)}
    >
      {children}
    </svg>
  );
}
