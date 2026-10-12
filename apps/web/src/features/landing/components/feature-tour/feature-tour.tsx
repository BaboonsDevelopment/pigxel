"use client";

import Image from "next/image";
import gardenNight from "../../../../../public/art/feature/garden-night.png";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";
import { AiBoard } from "./ai-board";
import { AnimateBoard } from "./animate-board";
import { DrawBoard } from "./draw-board";
import { ExportBoard } from "./export-board";
import { ExportIcon, FramesIcon, PencilIcon, SparklesIcon } from "./icons";
import styles from "./feature-tour.module.css";

const CHAPTERS = [
  {
    id: "draw",
    tab: "Draw",
    Icon: PencilIcon,
    text: "Pens, fills, mirror drawing, layers and palettes. Every pixel lands exactly where you put it.",
    scene:
      "Draw: a cursor draws the Pigxel pig with mirror drawing on, fills her with the bucket and adds her eyes. Then it’s your turn to draw.",
  },
  {
    id: "animate",
    tab: "Animate",
    Icon: FramesIcon,
    text: "Add frames, set their timing and see the one before with onion skin. Then press play.",
    scene:
      "Animate: the pig paints a flower, frame by frame, while the timeline plays along.",
  },
  {
    id: "ai",
    tab: "AI helper",
    Icon: SparklesIcon,
    text: "Describe a change in plain words. The helper redraws your pixels, and you keep it or undo it.",
    scene:
      "AI helper: someone asks to make a garden night, and the picture is redrawn as the same garden at night, with fireflies.",
  },
  {
    id: "export",
    tab: "Export",
    Icon: ExportIcon,
    text: "Looping GIFs, crisp PNGs, sprite sheets with Aseprite data for game engines, even a timelapse of how you drew it.",
    scene:
      "Export: a GIF, a PNG, a sprite sheet, Aseprite JSON and a timelapse video fan out, ready to share.",
  },
] as const;

const AI = 2;

const smooth = (value: number) => {
  const t = Math.min(1, Math.max(0, value));
  return t * t * (3 - 2 * t);
};

const motionQuery = "(prefers-reduced-motion: reduce)";
const subscribeMotion = (callback: () => void) => {
  const media = window.matchMedia(motionQuery);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
};

type View = {
  chapter: number;
  /** Whether the tour is pinned on screen. */
  inView: boolean;
  /** How many times each chapter has started; replays its animations. */
  runs: number[];
  /** The AI chapter's run in which the garden turned to night. */
  nightRun: number;
};

function Body({
  index,
  chapter,
  children,
}: {
  index: number;
  chapter: number;
  children: ReactNode;
}) {
  const shown = index === chapter;
  return (
    <div
      className={styles.body}
      data-active={shown || undefined}
      aria-hidden={!shown || undefined}
      inert={!shown}
    >
      {children}
    </div>
  );
}

/**
 * The features as a full-screen product tour pinned on screen while you
 * scroll, switching between drawing, animating, the AI helper and exporting.
 * The tabs fill as each chapter goes by; clicking one jumps to it.
 */
export function FeatureTour() {
  const [view, setView] = useState<View>({
    chapter: 0,
    inView: false,
    runs: CHAPTERS.map(() => 0),
    nightRun: -1,
  });
  const reducedMotion = useSyncExternalStore(
    subscribeMotion,
    () => window.matchMedia(motionQuery).matches,
    () => false,
  );
  const track = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const ledes = useRef<HTMLDivElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  // Reserve exactly the space the controls need, including wrapped copy.
  useEffect(() => {
    const root = viewport.current;
    const copy = ledes.current;
    if (!root || !copy) return;
    const measure = () => {
      root.style.setProperty(
        "--scene-top",
        `${copy.offsetTop + copy.offsetHeight + 20}px`,
      );
    };
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    observer.observe(copy);
    measure();
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const node = track.current;
    if (!node) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const box = node.getBoundingClientRect();
      const vh = window.innerHeight;
      const root = viewport.current;
      const height = root?.clientHeight ?? vh;
      // Keep the final chapter pinned for one more screen during the dissolve.
      const handoff = reducedMotion ? 0 : height;
      const span = Math.max(1, box.height - height - handoff);
      if (root) {
        const departure = reducedMotion
          ? 1
          : smooth((box.bottom - height) / height);
        root.style.setProperty(
          "--entrance",
          (reducedMotion ? 1 : smooth(1 - box.top / height)).toFixed(3),
        );
        root.style.setProperty(
          "--warmup",
          (reducedMotion ? 1 : smooth(-box.top / (height * 0.35))).toFixed(3),
        );
        root.style.setProperty("--departure", departure.toFixed(3));
        root.inert = departure < 0.05;
      }
      const progress = Math.min(1, Math.max(0, -box.top / span));
      const at = progress * CHAPTERS.length;
      const chapter = Math.min(CHAPTERS.length - 1, Math.floor(at));
      tabs.current.forEach((tab, i) =>
        tab?.style.setProperty(
          "--p",
          Math.min(1, Math.max(0, at - i)).toFixed(3),
        ),
      );
      const inView = box.top < vh * 0.35 && box.bottom > vh * 0.65;
      setView((prev) => {
        if (prev.chapter === chapter && prev.inView === inView) return prev;
        const starts = inView && (!prev.inView || prev.chapter !== chapter);
        return {
          ...prev,
          chapter,
          inView,
          runs: starts
            ? prev.runs.map((n, i) => (i === chapter ? n + 1 : n))
            : prev.runs,
        };
      });
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [reducedMotion]);

  const onNight = useCallback(
    () => setView((prev) => ({ ...prev, nightRun: prev.runs[AI]! })),
    [],
  );

  const goTo = (index: number) => {
    const node = track.current;
    if (!node) return;
    const box = node.getBoundingClientRect();
    const height = viewport.current?.clientHeight ?? window.innerHeight;
    const span = box.height - height - (reducedMotion ? 0 : height);
    window.scrollTo({
      top: window.scrollY + box.top + ((index + 0.12) / CHAPTERS.length) * span,
      behavior: reducedMotion ? "auto" : "smooth",
    });
  };

  const { chapter, inView, runs } = view;
  const night = chapter === AI && view.nightRun === runs[AI];

  return (
    <div ref={track} className={styles.tour}>
      <div
        ref={viewport}
        className={styles.viewport}
        data-chapter={CHAPTERS[chapter]!.id}
        data-night={night || undefined}
      >
        <nav
          className={styles.tabs}
          aria-label="Feature tour"
          style={{ "--active": chapter } as CSSProperties}
        >
          <span className={styles.tabIndicator} aria-hidden="true" />
          {CHAPTERS.map(({ id, tab, Icon }, i) => (
            <button
              key={id}
              ref={(node) => {
                tabs.current[i] = node;
              }}
              type="button"
              className={styles.tab}
              aria-current={i === chapter ? "step" : undefined}
              onClick={() => goTo(i)}
            >
              <Icon />
              {tab}
              <span className={styles.tabFill} aria-hidden="true" />
            </button>
          ))}
        </nav>

        <div ref={ledes} className={styles.ledes}>
          {CHAPTERS.map(({ id, text }, i) => (
            <p
              key={id}
              data-active={i === chapter || undefined}
              aria-hidden={i !== chapter || undefined}
            >
              {text}
            </p>
          ))}
        </div>
        <p className="sr-only" aria-live="polite">
          {CHAPTERS[chapter]!.scene}
        </p>

        <div
          className={styles.stage}
          data-chapter={CHAPTERS[chapter]!.id}
          data-night={night || undefined}
        >
          <Image
            src={gardenNight}
            alt=""
            fill
            sizes="100vw"
            className={styles.stageBackdrop}
          />
          <span className={styles.stars} aria-hidden="true" />
          <div className={styles.window}>
            <div className={styles.area}>
              <Body index={0} chapter={chapter}>
                <DrawBoard
                  active={inView && chapter === 0}
                  reducedMotion={reducedMotion}
                />
              </Body>
              <Body index={1} chapter={chapter}>
                <AnimateBoard key={runs[1]} />
              </Body>
              <Body index={2} chapter={chapter}>
                <AiBoard
                  key={runs[AI]}
                  active={inView && chapter === AI}
                  reducedMotion={reducedMotion}
                  onNight={onNight}
                />
              </Body>
              <Body index={3} chapter={chapter}>
                <ExportBoard key={runs[3]} />
              </Body>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
