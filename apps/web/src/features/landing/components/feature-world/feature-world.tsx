"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { colorCount, INK, PALETTE, pigGrid, SIZE, type Grid } from "./model";
import { PAINT_FRAMES } from "../pixel-art";
import { requestRedraw, WorldCanvas, type WorldState } from "./world-canvas";
import styles from "./feature-world.module.css";

const STEPS = [
  {
    id: "draw",
    title: "Draw",
    text: "Pens, shapes, fills, shading and dither, with layers, palettes, mirror drawing and tiled mode. Paint on the card and watch the pig change.",
    chips: ["Layers", "Mirror", "Tiled mode", "Dither"],
    scene:
      "The Pigxel pig standing on a little island, built from 3D pixels, with a small canvas to paint on.",
  },
  {
    id: "animate",
    title: "Animate",
    text: "Add frames, set their timing and see the frames before this one with onion skin.",
    chips: ["Frames", "Onion skin", "Tags", "Looping GIFs"],
    scene:
      "The pig blinking and wiggling her ears, with her earlier frames fanned out behind her.",
  },
  {
    id: "ai",
    title: "Ask the AI helper",
    text: "Describe a change in plain words. The helper edits your pixels, and you keep it or undo it.",
    chips: ["Recolor", "Edit", "Animate", "Generate"],
    scene:
      "A chat asks to make the pig blue for an ice level, and a wave of blue sweeps across her.",
  },
  {
    id: "export",
    title: "Export anywhere",
    text: "PNG and JPEG up to 20× with sharp pixels, looping GIFs and WebP, and sprite sheets with Aseprite JSON for game engines.",
    chips: ["PNG", "GIF", "WebP", "Sprite sheet"],
    scene:
      "A light sweeps across the pig while PNG, GIF and sprite sheet exports finish.",
  },
] as const;

const reducedMotionQuery = "(prefers-reduced-motion: reduce)";
const compactQuery = "(max-width: 900px)";
const subscribeCompact = (callback: () => void) => {
  const media = window.matchMedia(compactQuery);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
};

const subscribeMotion = (callback: () => void) => {
  const media = window.matchMedia(reducedMotionQuery);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
};

export function FeatureWorld() {
  // Which step is showing, and how many times each has started, so its
  // card's animations replay from the beginning every time.
  const [view, setView] = useState({ active: 0, runs: [1, 0, 0, 0] });
  const { active, runs } = view;
  const activate = useCallback(
    (index: number) =>
      setView((previous) =>
        previous.active === index
          ? previous
          : {
              active: index,
              runs: previous.runs.map((n, i) => (i === index ? n + 1 : n)),
            },
      ),
    [],
  );
  const [grid, setGrid] = useState<Grid>(pigGrid);
  const reducedMotion = useSyncExternalStore(
    subscribeMotion,
    () => window.matchMedia(reducedMotionQuery).matches,
    () => false,
  );
  // On small screens the stage pins to the top, so steps are read lower down.
  const compact = useSyncExternalStore(
    subscribeCompact,
    () => window.matchMedia(compactQuery).matches,
    () => false,
  );
  const stage = useRef<HTMLDivElement>(null);
  const steps = useRef<(HTMLElement | null)[]>([]);
  const list = useRef<HTMLOListElement>(null);
  const world = useRef<WorldState>({
    step: 0,
    since: 0,
    grid,
    edits: new Map(),
    reducedMotion,
  });

  // Keep the canvas's view of the world current without re-rendering it.
  useEffect(() => {
    world.current.grid = grid;
    world.current.reducedMotion = reducedMotion;
    requestRedraw(stage.current);
  }, [grid, reducedMotion]);

  useEffect(() => {
    world.current.step = active;
    world.current.since = performance.now();
    requestRedraw(stage.current);
  }, [active]);

  // The step crossing the middle of the screen is the active one.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting)
            activate(Number((entry.target as HTMLElement).dataset.index));
      },
      {
        rootMargin: compact ? "-78% 0px -21% 0px" : "-50% 0px -50% 0px",
      },
    );
    for (const node of steps.current) if (node) observer.observe(node);
    return () => observer.disconnect();
  }, [activate, compact]);

  // The rail fills as the steps scroll past the middle of the screen.
  useEffect(() => {
    const node = list.current;
    if (!node) return;
    let frame = 0;
    const update = () => {
      const box = node.getBoundingClientRect();
      const middle = window.innerHeight / 2;
      const progress = Math.min(
        1,
        Math.max(0, (middle - box.top) / box.height),
      );
      node.style.setProperty("--progress", progress.toFixed(4));
    };
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const paint = useCallback((cell: number, color: string) => {
    setGrid((previous) => {
      if (previous[cell] === color) return previous;
      const next = [...previous];
      next[cell] = color;
      return next;
    });
    world.current.edits.set(cell, performance.now());
    requestRedraw(stage.current);
  }, []);

  const goTo = (index: number) =>
    steps.current[index]?.scrollIntoView({
      block: "center",
      behavior: reducedMotion ? "auto" : "smooth",
    });

  const step = STEPS[active]!;
  const frames = active === 1 || active === 3 ? 4 : 1;

  return (
    <div className={styles.world}>
      <ol ref={list} className={styles.steps}>
        <span className={styles.rail} aria-hidden="true">
          <span />
        </span>
        {STEPS.map((item, index) => (
          <li
            key={item.id}
            ref={(node) => {
              steps.current[index] = node;
            }}
            data-index={index}
            data-active={index === active || undefined}
            className={styles.step}
          >
            <h3 className={styles.stepTitle}>
              <button
                type="button"
                className={styles.stepButton}
                aria-current={index === active ? "step" : undefined}
                onClick={() => goTo(index)}
              >
                <span className={styles.stepNumber}>0{index + 1}</span>
                {item.title}
              </button>
            </h3>
            <p className={styles.stepText}>{item.text}</p>
            <ul
              className={styles.chips}
              aria-label={`${item.title} highlights`}
            >
              {item.chips.map((chip, chipIndex) => (
                <li
                  key={chip}
                  style={{ "--i": chipIndex } as React.CSSProperties}
                >
                  {chip}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>

      <div className={styles.stageWrap}>
        <div ref={stage} className={styles.stage} data-step={step.id}>
          {STEPS.map((item, index) => (
            <span
              key={item.id}
              className={styles.glow}
              data-step={item.id}
              data-active={index === active || undefined}
              aria-hidden="true"
            />
          ))}
          <p className="sr-only" aria-live="polite">
            {step.scene}
          </p>
          <WorldCanvas state={world} />

          <div className={styles.stats} aria-hidden="true">
            <Stat label="Canvas" value="16 × 16" detail="pixels" />
            <Stat
              label="Colors"
              value={String(colorCount(grid))}
              detail="on canvas"
            />
            <Stat
              label="Frames"
              value={String(frames)}
              detail={
                active === 1
                  ? "600 ms each"
                  : frames > 1
                    ? "in the sheet"
                    : "still"
              }
            />
          </div>

          <Card active={active === 0} position="left">
            <PaintCard
              grid={grid}
              onPaint={paint}
              onReset={() => setGrid(pigGrid())}
            />
          </Card>
          <Card
            active={active === 1}
            position="bottom"
            run={runs[1]}
            decorative
          >
            <TimelineCard />
          </Card>
          <Card active={active === 2} position="right" run={runs[2]} decorative>
            <ChatCard recolored={grid.filter((c) => c && c !== INK).length} />
          </Card>
          <Card active={active === 3} position="right" run={runs[3]} decorative>
            <ExportCard />
          </Card>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className={styles.stat}>
      <span className={styles.statLabel}>{label}</span>
      <span key={value} className={styles.statValue}>
        {value}
      </span>
      <span className={styles.statDetail}>{detail}</span>
    </div>
  );
}

function Card({
  active,
  position,
  run = 0,
  decorative,
  children,
}: {
  active: boolean;
  position: "left" | "right" | "bottom";
  run?: number;
  decorative?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      key={decorative ? run : undefined}
      className={styles.card}
      data-position={position}
      data-active={active || undefined}
      aria-hidden={decorative || !active || undefined}
      inert={!active}
    >
      {children}
    </div>
  );
}

const CELL = 10;

function PaintCard({
  grid,
  onPaint,
  onReset,
}: {
  grid: Grid;
  onPaint: (cell: number, color: string) => void;
  onReset: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [color, setColor] = useState<string>(PALETTE[0].color);
  const [erasing, setErasing] = useState(false);
  const [cursor, setCursor] = useState<number | null>(null);
  const last = useRef<number | null>(null);

  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, SIZE * CELL, SIZE * CELL);
    grid.forEach((pixel, cell) => {
      if (!pixel) return;
      ctx.fillStyle = pixel;
      ctx.fillRect(
        (cell % SIZE) * CELL,
        Math.floor(cell / SIZE) * CELL,
        CELL,
        CELL,
      );
    });
    if (cursor !== null) {
      ctx.strokeStyle = "#0a0a0a";
      ctx.lineWidth = 2;
      ctx.strokeRect(
        (cursor % SIZE) * CELL + 1,
        Math.floor(cursor / SIZE) * CELL + 1,
        CELL - 2,
        CELL - 2,
      );
    }
  }, [grid, cursor]);

  const ink = erasing ? "" : color;

  const fromPointer = (event: PointerEvent<HTMLCanvasElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const x = Math.floor(((event.clientX - box.left) / box.width) * SIZE);
    const y = Math.floor(((event.clientY - box.top) / box.height) * SIZE);
    if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
    const cell = y * SIZE + x;
    const from = last.current ?? cell;
    const [fx, fy] = [from % SIZE, Math.floor(from / SIZE)];
    const steps = Math.max(Math.abs(x - fx), Math.abs(y - fy), 1);
    for (let s = 0; s <= steps; s++)
      onPaint(
        Math.round(fy + ((y - fy) * s) / steps) * SIZE +
          Math.round(fx + ((x - fx) * s) / steps),
        ink,
      );
    last.current = cell;
  };

  const onKeyDown = (event: KeyboardEvent<HTMLCanvasElement>) => {
    const current = cursor ?? 0;
    const [x, y] = [current % SIZE, Math.floor(current / SIZE)];
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [Math.max(0, x - 1), y],
      ArrowRight: [Math.min(SIZE - 1, x + 1), y],
      ArrowUp: [x, Math.max(0, y - 1)],
      ArrowDown: [x, Math.min(SIZE - 1, y + 1)],
    };
    const move = moves[event.key];
    if (move) {
      event.preventDefault();
      setCursor(move[1] * SIZE + move[0]);
    } else if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      onPaint(current, ink);
    }
  };

  return (
    <div className={styles.paint}>
      <div className={styles.cardHead}>
        <span>pig.pigxel</span>
        <button type="button" className={styles.textButton} onClick={onReset}>
          Reset
        </button>
      </div>
      <canvas
        ref={canvas}
        width={SIZE * CELL}
        height={SIZE * CELL}
        className={styles.paintCanvas}
        tabIndex={0}
        role="application"
        aria-label="Drawing canvas, 16 by 16. Drag to paint, or move with the arrow keys and press Space to paint. The 3D pig changes as you paint."
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          last.current = null;
          fromPointer(event);
        }}
        onPointerMove={(event) => {
          if (event.buttons) fromPointer(event);
        }}
        onPointerUp={() => (last.current = null)}
        onFocus={() => setCursor((c) => c ?? 0)}
        onBlur={() => setCursor(null)}
        onKeyDown={onKeyDown}
      />
      <div className={styles.swatches} role="group" aria-label="Colours">
        {PALETTE.map((swatch) => (
          <button
            key={swatch.color}
            type="button"
            className={styles.swatch}
            style={{ background: swatch.color }}
            aria-label={swatch.name}
            aria-pressed={!erasing && color === swatch.color}
            onClick={() => {
              setColor(swatch.color);
              setErasing(false);
            }}
          />
        ))}
        <button
          type="button"
          className={styles.eraser}
          aria-label="Eraser"
          aria-pressed={erasing}
          onClick={() => setErasing((e) => !e)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="m7 21-4-4 11-11 7 7-8 8Zm0 0h13"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

function TimelineCard() {
  return (
    <div className={styles.timeline}>
      <div className={styles.cardHead}>
        <span>painting.pigxel</span>
        <span className={styles.pill}>
          <i /> Onion skin
        </span>
      </div>
      <div className={styles.frames}>
        {PAINT_FRAMES.map((src, frame) => (
          <span
            key={frame}
            className={styles.frame}
            style={{ "--i": frame } as React.CSSProperties}
          >
            <Image src={src} alt="" sizes="64px" className={styles.thumb} />
            <small>{frame + 1}</small>
          </span>
        ))}
      </div>
      <div className={styles.playhead}>
        <span />
      </div>
    </div>
  );
}

const PROMPT = "Make her blue for the ice level";

function ChatCard({ recolored }: { recolored: number }) {
  return (
    <div className={styles.chat}>
      <div className={styles.cardHead}>
        <span>AI helper</span>
        <span className={styles.pill}>
          <i /> Ready
        </span>
      </div>
      <p className={styles.ask}>
        <span style={{ "--chars": PROMPT.length } as React.CSSProperties}>
          {PROMPT}
        </span>
      </p>
      <p className={styles.thinking}>
        <i />
        <i />
        <i />
      </p>
      <p className={styles.reply}>
        <span className={styles.check}>✓</span> Recolored {recolored} pixels to
        ice blue. Keep it?
      </p>
      <div className={styles.replyActions}>
        <span>Undo</span>
        <span>Keep</span>
      </div>
    </div>
  );
}

const EXPORTS = [
  { name: "PNG", detail: "20× · sharp pixels" },
  { name: "GIF", detail: "4 frames · looping" },
  { name: "Sheet", detail: "4 × 1 + Aseprite JSON" },
];

function ExportCard() {
  return (
    <div className={styles.export}>
      <div className={styles.cardHead}>
        <span>Export</span>
        <span className={styles.pill}>
          <i /> 3 files
        </span>
      </div>
      <ul>
        {EXPORTS.map((item, index) => (
          <li key={item.name} style={{ "--i": index } as React.CSSProperties}>
            <span className={styles.format}>{item.name}</span>
            <span className={styles.exportText}>
              {item.detail}
              <span className={styles.bar}>
                <span />
              </span>
            </span>
            <span className={styles.done}>✓</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
