"use client";

import Link from "next/link";
import { useEffect, useEffectEvent, useState } from "react";
import { Button, buttonVariants } from "@pigxel/ui/components/button";
import { cn } from "@pigxel/ui/lib/utils";
import type { SpriteApi } from "@/components/pixel-canvas/use-sprite";
import type { GuideState, Tutorial } from "@/lib/tutorials/tutorials";
import { useModifierLabel } from "../use-modifier-label";

/** How long a finished step shows its tick before the next one. */
const ADVANCE_MS = 900;

/**
 * A tutorial's interactive guide over the editor: one step at a time, with
 * what it's about outlined on screen. A step that watches the editor ticks
 * off by itself once done and moves on; the rest wait for Next.
 */
export function GuideCoach({
  tutorial,
  sprite,
  editor,
  onExit,
}: {
  tutorial: Tutorial;
  sprite: SpriteApi;
  /** The editor's state apart from what the pixels tell. */
  editor: Omit<GuideState, "painted" | "framesDiffer">;
  onExit: () => void;
}) {
  const state: GuideState = { ...editor, ...pixelState(sprite) };
  const [index, setIndex] = useState(0);
  // The editor as it was when the step began.
  const [from, setFrom] = useState(state);
  const [hidden, setHidden] = useState(false);
  const mod = useModifierLabel();
  const { steps } = tutorial;
  const step = steps[index];

  const done = !!step?.done?.(state, from);
  // A step done already when it began waits for Next instead of skipping by.
  const doneAtStart = !!step?.done?.(from, from);

  const go = (to: number) => {
    setIndex(Math.max(0, Math.min(steps.length, to)));
    setFrom(state);
  };
  const advance = useEffectEvent(() => go(index + 1));

  useEffect(() => {
    if (!done || doneAtStart) return;
    const timer = setTimeout(advance, ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [done, doneAtStart, index]);

  if (hidden)
    return (
      <button
        type="button"
        onClick={() => setHidden(false)}
        className="fixed top-28 left-[7.5rem] z-40 flex items-center gap-2 rounded-full border bg-background py-1.5 pr-3 pl-2 text-sm shadow-lg hover:bg-muted"
      >
        <GuideBadge />
        {step ? `Step ${index + 1} of ${steps.length}` : "Guide finished"}
        <span className="text-muted-foreground">· Show</span>
      </button>
    );

  return (
    <>
      {step?.target && <Spotlight selector={step.target} />}
      <aside
        aria-label={`Guide: ${tutorial.title}`}
        className="fixed top-28 left-[7.5rem] z-40 w-80 overflow-hidden rounded-2xl border bg-background shadow-xl"
      >
        <div className="flex items-center gap-2 bg-linear-120 from-[#f6e8f0] to-[#efe6f8] py-2 pr-1.5 pl-3">
          <GuideBadge />
          <p className="min-w-0 flex-1 truncate text-sm font-semibold">
            {tutorial.title}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            title="Hide the guide"
            aria-label="Hide the guide"
            onClick={() => setHidden(true)}
          >
            –
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            title="End the guide"
            aria-label="End the guide"
            onClick={onExit}
            className="text-lg leading-none"
          >
            ×
          </Button>
        </div>
        <ol aria-hidden="true" className="flex gap-1 px-3 pt-3">
          {steps.map((s, i) => (
            <li
              key={s.title}
              className={cn(
                "h-1 flex-1 rounded-full bg-muted transition-colors",
                (i < index || (i === index && done)) && "bg-primary",
              )}
            />
          ))}
        </ol>

        {step ? (
          <div className="p-4 pt-3" aria-live="polite">
            <p className="font-mono text-[11px] text-muted-foreground tabular-nums">
              Step {index + 1} of {steps.length}
            </p>
            <h2 className="mt-1 font-display text-xl tracking-tight">
              {step.title}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-foreground/90">
              {step.body}
            </p>
            {step.keys && (
              <p className="mt-3 flex flex-wrap gap-1.5">
                {step.keys.map((key) => (
                  <kbd
                    key={key}
                    className="rounded-md border border-b-2 bg-muted px-1.5 py-0.5 font-mono text-xs"
                  >
                    {key.replace("Mod+", mod)}
                  </kbd>
                ))}
              </p>
            )}
            {step.done && (
              <p
                className={cn(
                  "mt-3 text-xs font-medium",
                  done ? "text-success" : "text-muted-foreground",
                )}
              >
                {done ? "✓ Done" : "Try it: this ticks off when you do."}
              </p>
            )}
            <div className="mt-4 flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={index === 0}
                onClick={() => go(index - 1)}
              >
                Back
              </Button>
              <Button
                type="button"
                variant={step.done && !done ? "secondary" : "primary"}
                size="sm"
                onClick={() => go(index + 1)}
              >
                {index === steps.length - 1
                  ? "Finish"
                  : step.done && !done
                    ? "Skip"
                    : "Next"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-4 pt-3" aria-live="polite">
            <h2 className="font-display text-xl tracking-tight">
              Nicely done!
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              You’ve finished “{tutorial.title}”. This practice tile is kept in
              this browser: save it to Pigxel cloud from the File menu to keep
              it.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={onExit}>
                Keep drawing
              </Button>
              <Link
                href="/tutorials"
                className={buttonVariants({ variant: "secondary", size: "sm" })}
              >
                More tutorials
              </Link>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

/** What the guide learns from the pixels: how much is drawn, and whether the frames differ. */
function pixelState(
  sprite: SpriteApi,
): Pick<GuideState, "painted" | "framesDiffer"> {
  const shown = sprite.composite(["reference"]);
  let painted = 0;
  for (let i = 3; i < shown.length; i += 4) if (shown[i]) painted++;
  const [first, ...rest] = sprite.frames;
  const firstPixels = first && sprite.composite(["reference"], first.id);
  const framesDiffer =
    !!firstPixels &&
    rest.some((frame) => {
      const pixels = sprite.composite(["reference"], frame.id);
      return pixels.some((value, i) => value !== firstPixels[i]);
    });
  return { painted, framesDiffer };
}

/** A ring around what the step is about, following it as the layout moves. */
function Spotlight({ selector }: { selector: string }) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    let frame = 0;
    let last = "";
    const track = () => {
      const box = document.querySelector(selector)?.getBoundingClientRect();
      const key = box ? `${box.x},${box.y},${box.width},${box.height}` : "";
      if (key !== last) {
        last = key;
        setRect(box && box.width > 0 ? box : null);
      }
      frame = requestAnimationFrame(track);
    };
    frame = requestAnimationFrame(track);
    return () => cancelAnimationFrame(frame);
  }, [selector]);

  if (!rect) return null;
  return (
    <div
      aria-hidden="true"
      style={{
        left: rect.x - 4,
        top: rect.y - 4,
        width: rect.width + 8,
        height: rect.height + 8,
      }}
      className="pointer-events-none fixed z-40 rounded-xl border-2 border-primary ring-6 ring-primary/20 transition-all duration-300 ease-out motion-safe:animate-pulse motion-reduce:transition-none"
    />
  );
}

function GuideBadge() {
  return (
    <span className="rounded-full bg-primary px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wide text-primary-foreground uppercase">
      Guide
    </span>
  );
}
