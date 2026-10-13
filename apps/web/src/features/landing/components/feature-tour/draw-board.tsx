"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import {
  buildDrawScript,
  finalGrid,
  mirrorOf,
  PIG_COLORS,
  SIZE,
  type Action,
  type Target,
  type Tool,
} from "./draw-script";
import {
  BucketIcon,
  CursorArrow,
  EraserIcon,
  EyeIcon,
  MirrorIcon,
  PencilIcon,
} from "./icons";
import styles from "./feature-tour.module.css";

const SWATCHES = [
  { name: "Rose", color: PIG_COLORS.r, target: "color-r" },
  { name: "Blush", color: PIG_COLORS.b, target: "color-b" },
  { name: "Ink", color: PIG_COLORS.k, target: "color-k" },
  { name: "Butter", color: "#e7be5f" },
  { name: "Leaf", color: "#71927a" },
  { name: "Sky", color: "#6f9be8" },
] as const;

const TOOLS: { id: Tool; name: string; Icon: typeof PencilIcon }[] = [
  { id: "pencil", name: "Pencil", Icon: PencilIcon },
  { id: "eraser", name: "Eraser", Icon: EraserIcon },
  { id: "bucket", name: "Fill", Icon: BucketIcon },
];

/** Room the hint above and the dock below the drawing need, in px. */
const TOP = 56;
const BOTTOM = 84;
const POP_MS = 170;
const FLASH_MS = 280;
const RIPPLE_MS = 650;
const FILL_RING_MS = 18;

const CENTER = 7 * SIZE + 7;

const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
const easeOut = (t: number) => 1 - (1 - t) ** 3;
const easeOutBack = (t: number) => 1 + 2.4 * (t - 1) ** 3 + 1.4 * (t - 1) ** 2;
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

type Geometry = {
  w: number;
  h: number;
  ratio: number;
  cell: number;
  ox: number;
  oy: number;
};

/** An element's position inside `root`, ignoring transforms. */
function offsetWithin(el: HTMLElement, root: HTMLElement) {
  let x = el.offsetWidth / 2;
  let y = el.offsetHeight / 2;
  let node: HTMLElement | null = el;
  while (node && node !== root) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return node === root ? { x, y } : null;
}

export function DrawBoard({
  active,
  reducedMotion,
}: {
  active: boolean;
  reducedMotion: boolean;
}) {
  const script = useMemo(() => buildDrawScript(), []);
  const [tool, setTool] = useState<Tool>("pencil");
  const [color, setColor] = useState<string>(PIG_COLORS.r);
  const [mirror, setMirror] = useState(true);
  const [touched, setTouched] = useState(false);
  const [finished, setFinished] = useState(false);

  const board = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const cursor = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLElement>(null);
  const geometry = useRef<Geometry | null>(null);
  const base = useRef<HTMLCanvasElement | null>(null);
  const grid = useRef<string[]>(Array(SIZE * SIZE).fill(""));
  const paintedAt = useRef(new Float64Array(SIZE * SIZE));
  const flashes = useRef(new Map<number, number>());
  const ripples = useRef<{ x: number; y: number; at: number }[]>([]);
  const playing = useRef<{ start: number; index: number } | null>(null);
  const hover = useRef<number | null>(null);
  const focus = useRef<number | null>(null);
  const last = useRef<number | null>(null);
  const frame = useRef(0);
  const settings = useRef({ tool, color, mirror });
  settings.current = { tool, color, mirror };

  const render = useCallback((now: number) => {
    const ctx = canvas.current?.getContext("2d");
    const g = geometry.current;
    if (!ctx || !g) return;
    const { cell, ox, oy, ratio } = g;
    const size = cell * SIZE;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, g.w * ratio, g.h * ratio);
    if (base.current) ctx.drawImage(base.current, 0, 0);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    const cells = grid.current;
    for (let i = 0; i < cells.length; i++) {
      const fill = cells[i];
      if (!fill) continue;
      const age = now - paintedAt.current[i]!;
      if (age < 0) continue;
      const s = age < POP_MS ? 0.3 + 0.7 * easeOutBack(age / POP_MS) : 1;
      const d = cell * s;
      ctx.fillStyle = fill;
      ctx.fillRect(
        ox + (i % SIZE) * cell + (cell - d) / 2,
        oy + Math.floor(i / SIZE) * cell + (cell - d) / 2,
        d,
        d,
      );
    }

    if (cell >= 10) {
      ctx.beginPath();
      for (let k = 1; k < SIZE; k++) {
        ctx.moveTo(ox + k * cell + 0.5, oy);
        ctx.lineTo(ox + k * cell + 0.5, oy + size);
        ctx.moveTo(ox, oy + k * cell + 0.5);
        ctx.lineTo(ox + size, oy + k * cell + 0.5);
      }
      ctx.strokeStyle = "rgb(14 14 17 / 0.06)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    const { mirror: mirrored, color: ink, tool: current } = settings.current;
    if (mirrored) {
      ctx.save();
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = "rgb(47 91 255 / 0.6)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(ox + size / 2, oy - 12);
      ctx.lineTo(ox + size / 2, oy + size + 12);
      ctx.stroke();
      ctx.restore();
    }

    for (const [i, at] of flashes.current) {
      const u = (now - at) / FLASH_MS;
      if (u >= 1 || u < 0) continue;
      ctx.strokeStyle = `rgb(47 91 255 / ${0.85 * (1 - u)})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(
        ox + (i % SIZE) * cell - 1,
        oy + Math.floor(i / SIZE) * cell - 1,
        cell + 2,
        cell + 2,
      );
    }

    for (const r of ripples.current) {
      const u = (now - r.at) / RIPPLE_MS;
      if (u >= 1 || u < 0) continue;
      ctx.strokeStyle = `rgb(219 20 88 / ${0.45 * (1 - u)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(r.x, r.y, cell * (0.6 + 7 * easeOut(u)), 0, Math.PI * 2);
      ctx.stroke();
    }

    const preview = hover.current ?? focus.current;
    if (preview !== null && !playing.current) {
      const x = ox + (preview % SIZE) * cell;
      const y = oy + Math.floor(preview / SIZE) * cell;
      if (current !== "eraser" && current !== "bucket") {
        ctx.globalAlpha = 0.45;
        ctx.fillStyle = ink;
        ctx.fillRect(x, y, cell, cell);
        ctx.globalAlpha = 1;
      }
      ctx.strokeStyle = "#0e0e11";
      ctx.lineWidth = focus.current === preview ? 2 : 1;
      ctx.strokeRect(x + 0.5, y + 0.5, cell - 1, cell - 1);
    }
  }, []);

  const resolve = useCallback((target: Target) => {
    const g = geometry.current;
    if (!g) return null;
    if ("cell" in target)
      return {
        x: g.ox + (target.cell[0] + 0.5) * g.cell,
        y: g.oy + (target.cell[1] + 0.5) * g.cell,
      };
    const el = board.current?.querySelector<HTMLElement>(
      `[data-target="${target.ui}"]`,
    );
    return el && board.current ? offsetWithin(el, board.current) : null;
  }, []);

  const placeCursor = useCallback(
    (t: number) => {
      const node = cursor.current;
      const points = script.waypoints;
      if (!node || !points.length) return;
      let i = points.findIndex((p) => p.at > t);
      if (i === -1) i = points.length - 1;
      const to = points[i]!;
      const from = points[Math.max(0, i - 1)]!;
      const span = to.at - from.at;
      const u = span > 0 ? clamp01((t - from.at) / span) : 1;
      const a = resolve(from.target);
      const b = resolve(to.target) ?? a;
      if (!a || !b) return;
      const k = to.ease === "glide" ? easeInOut(u) : u;
      node.style.transform = `translate3d(${a.x + (b.x - a.x) * k}px, ${a.y + (b.y - a.y) * k}px, 0)`;
    },
    [resolve, script.waypoints],
  );

  const press = useCallback(
    (target: Target, now: number) => {
      ring.current?.animate(
        [
          { transform: "scale(0.3)", opacity: 0.9 },
          { transform: "scale(1.5)", opacity: 0 },
        ],
        { duration: 420, easing: "ease-out" },
      );
      cursor.current
        ?.querySelector("svg")
        ?.animate([{ scale: "1" }, { scale: "0.8" }, { scale: "1" }], {
          duration: 220,
        });
      if ("cell" in target) {
        const p = resolve(target);
        if (p) ripples.current.push({ ...p, at: now });
      }
    },
    [resolve],
  );

  const apply = useCallback(
    (action: Action, now: number) => {
      if (action.type === "paint") {
        grid.current[action.cell] = action.color;
        paintedAt.current[action.cell] = now;
        if (action.mirrored) flashes.current.set(action.cell, now);
      } else if (action.type === "tool") setTool(action.tool);
      else if (action.type === "color") setColor(action.color);
      else press(action.target, now);
    },
    [press],
  );

  const tick = useCallback(
    function loop(now: number) {
      const p = playing.current;
      if (p) {
        const t = now - p.start;
        const { actions } = script;
        while (p.index < actions.length && actions[p.index]!.at <= t) {
          const action = actions[p.index++]!;
          apply(action, p.start + action.at);
        }
        placeCursor(t);
        if (t >= script.duration) {
          playing.current = null;
          cursor.current?.removeAttribute("data-shown");
          setFinished(true);
        }
      }
      render(now);
      const busy =
        playing.current !== null ||
        ripples.current.some((r) => now - r.at < RIPPLE_MS) ||
        [...flashes.current.values()].some((at) => now - at < FLASH_MS) ||
        paintedAt.current.some((at) => now - at < POP_MS);
      frame.current = busy ? requestAnimationFrame(loop) : 0;
    },
    [apply, placeCursor, render, script],
  );

  const wake = useCallback(() => {
    if (!frame.current) frame.current = requestAnimationFrame(tick);
  }, [tick]);

  const play = useCallback(() => {
    grid.current.fill("");
    paintedAt.current.fill(0);
    flashes.current.clear();
    ripples.current = [];
    setFinished(false);
    setMirror(true);
    playing.current = { start: performance.now(), index: 0 };
    cursor.current?.setAttribute("data-shown", "");
    placeCursor(0);
    wake();
  }, [placeCursor, wake]);

  /** Jumps to the end of the recording, so a visitor can take over. */
  const finish = useCallback(() => {
    if (!playing.current) return;
    playing.current = null;
    grid.current = finalGrid(script);
    paintedAt.current.fill(0);
    cursor.current?.removeAttribute("data-shown");
    setFinished(true);
    wake();
  }, [script, wake]);

  // Size the canvas to the board and draw the empty artboard once per size.
  useEffect(() => {
    const node = board.current;
    const el = canvas.current;
    if (!node || !el) return;
    const measure = () => {
      const w = node.clientWidth;
      const h = node.clientHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const room = Math.max(96, h - TOP - BOTTOM);
      // Narrow boards give the drawing more of their width.
      const share = w < 520 ? 0.88 : 0.7;
      const cell = Math.max(6, Math.floor(Math.min(w * share, room) / SIZE));
      const size = cell * SIZE;
      const g: Geometry = {
        w,
        h,
        ratio,
        cell,
        ox: Math.round((w - size) / 2),
        oy: Math.round(TOP + (room - size) / 2),
      };
      geometry.current = g;
      el.width = Math.round(w * ratio);
      el.height = Math.round(h * ratio);

      const off = document.createElement("canvas");
      off.width = el.width;
      off.height = el.height;
      const ctx = off.getContext("2d");
      if (ctx) {
        ctx.scale(ratio, ratio);
        ctx.save();
        ctx.shadowColor = "rgb(40 20 50 / 0.16)";
        ctx.shadowBlur = 28;
        ctx.shadowOffsetY = 12;
        ctx.fillStyle = "#fff";
        ctx.fillRect(g.ox, g.oy, size, size);
        ctx.restore();
        ctx.fillStyle = "#f2f2f5";
        const half = cell / 2;
        for (let y = 0; y < SIZE * 2; y++)
          for (let x = 0; x < SIZE * 2; x++)
            if ((x + y) % 2)
              ctx.fillRect(g.ox + x * half, g.oy + y * half, half, half);
        ctx.strokeStyle = "rgb(14 14 17 / 0.08)";
        ctx.strokeRect(g.ox - 0.5, g.oy - 0.5, size + 1, size + 1);
      }
      base.current = off;
      if (playing.current)
        placeCursor(performance.now() - playing.current.start);
      render(performance.now());
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [placeCursor, render]);

  // Play the recording when the chapter comes into view, unless someone has
  // started drawing; jump to its end when the chapter is left.
  useEffect(() => {
    if (!active) {
      finish();
      return;
    }
    if (touched) return;
    if (reducedMotion) {
      grid.current = finalGrid(script);
      paintedAt.current.fill(0);
      const id = requestAnimationFrame(() => {
        setFinished(true);
        render(performance.now());
      });
      return () => cancelAnimationFrame(id);
    }
    const id = requestAnimationFrame(() => play());
    return () => cancelAnimationFrame(id);
  }, [active, finish, play, reducedMotion, render, script, touched]);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  // Tool, colour and mirror changes show on the canvas (preview, axis).
  useEffect(() => {
    if (!playing.current) render(performance.now());
  }, [tool, color, mirror, render]);

  const takeOver = () => {
    finish();
    if (!touched) setTouched(true);
  };

  const cellAt = (event: PointerEvent<HTMLCanvasElement>) => {
    const g = geometry.current;
    if (!g) return null;
    const box = event.currentTarget.getBoundingClientRect();
    const x = Math.floor((event.clientX - box.left - g.ox) / g.cell);
    const y = Math.floor((event.clientY - box.top - g.oy) / g.cell);
    return x < 0 || y < 0 || x >= SIZE || y >= SIZE ? null : y * SIZE + x;
  };

  const put = (cell: number, now: number) => {
    const { tool: current, color: ink, mirror: mirrored } = settings.current;
    const value = current === "eraser" ? "" : ink;
    for (const target of mirrored ? [cell, mirrorOf(cell)] : [cell]) {
      if (grid.current[target] === value) continue;
      grid.current[target] = value;
      paintedAt.current[target] = now;
      if (target !== cell) flashes.current.set(target, now);
    }
  };

  const fillFrom = (seed: number, now: number) => {
    const { color: ink, mirror: mirrored } = settings.current;
    for (const start of mirrored ? [seed, mirrorOf(seed)] : [seed]) {
      const from = grid.current[start];
      if (from === ink) continue;
      const queue = [start];
      const depth = new Map([[start, 0]]);
      for (let i = 0; i < queue.length; i++) {
        const cell = queue[i]!;
        const d = depth.get(cell)!;
        grid.current[cell] = ink;
        paintedAt.current[cell] = now + d * FILL_RING_MS;
        const x = cell % SIZE;
        for (const n of [
          x > 0 ? cell - 1 : -1,
          x < SIZE - 1 ? cell + 1 : -1,
          cell - SIZE,
          cell + SIZE,
        ])
          if (
            n >= 0 &&
            n < SIZE * SIZE &&
            !depth.has(n) &&
            grid.current[n] === from
          ) {
            depth.set(n, d + 1);
            queue.push(n);
          }
      }
      const p = resolve({ cell: [start % SIZE, Math.floor(start / SIZE)] });
      if (p) ripples.current.push({ ...p, at: now });
    }
  };

  const drawAt = (cell: number) => {
    const now = performance.now();
    if (settings.current.tool === "bucket") fillFrom(cell, now);
    else put(cell, now);
    wake();
  };

  const lineTo = (to: number) => {
    const from = last.current ?? to;
    const [fx, fy, tx, ty] = [
      from % SIZE,
      Math.floor(from / SIZE),
      to % SIZE,
      Math.floor(to / SIZE),
    ];
    const steps = Math.max(Math.abs(tx - fx), Math.abs(ty - fy), 1);
    const now = performance.now();
    for (let s = 0; s <= steps; s++)
      put(
        Math.round(fy + ((ty - fy) * s) / steps) * SIZE +
          Math.round(fx + ((tx - fx) * s) / steps),
        now,
      );
    last.current = to;
    wake();
  };

  const replay = () => {
    // Clearing `touched` lets the chapter's effect start the recording.
    if (touched) setTouched(false);
    else play();
  };

  const reset = () => {
    grid.current = finalGrid(script);
    paintedAt.current.fill(0);
    setTouched(false);
    wake();
  };

  /** Touch only paints on a tap, so swiping over the board still scrolls. */
  const tap = useRef<{ id: number; x: number; y: number } | null>(null);

  const onKeyDown = (event: KeyboardEvent<HTMLCanvasElement>) => {
    const current = focus.current ?? CENTER;
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
      focus.current = move[1] * SIZE + move[0];
      render(performance.now());
    } else if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      takeOver();
      drawAt(current);
    }
  };

  return (
    <div ref={board} className={styles.drawBoard}>
      <canvas
        ref={canvas}
        className={styles.drawCanvas}
        tabIndex={0}
        role="application"
        aria-label="A 16 by 16 drawing of the Pigxel pig. Drag to draw with the selected tool and colour, or move with the arrow keys and press Space. Mirror drawing copies each pixel to the other side."
        onPointerDown={(event) => {
          if (event.pointerType === "touch") {
            tap.current = {
              id: event.pointerId,
              x: event.clientX,
              y: event.clientY,
            };
            return;
          }
          const cell = cellAt(event);
          takeOver();
          if (cell === null) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          last.current = cell;
          drawAt(cell);
        }}
        onPointerMove={(event) => {
          if (event.pointerType === "touch") return;
          const cell = cellAt(event);
          if (hover.current !== cell) {
            hover.current = cell;
            if (!playing.current) wake();
          }
          if (
            event.buttons &&
            cell !== null &&
            last.current !== null &&
            settings.current.tool !== "bucket"
          )
            lineTo(cell);
        }}
        onPointerUp={(event) => {
          last.current = null;
          const start = tap.current;
          tap.current = null;
          if (
            event.pointerType !== "touch" ||
            start?.id !== event.pointerId ||
            Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10
          )
            return;
          const cell = cellAt(event);
          takeOver();
          if (cell !== null) drawAt(cell);
        }}
        onPointerCancel={() => {
          tap.current = null;
          last.current = null;
        }}
        onPointerLeave={() => {
          hover.current = null;
          wake();
        }}
        onFocus={() => {
          focus.current ??= CENTER;
          wake();
        }}
        onBlur={() => {
          focus.current = null;
          wake();
        }}
        onKeyDown={onKeyDown}
      />

      <div ref={cursor} className={styles.cursor} aria-hidden="true">
        <i ref={ring} className={styles.cursorRing} />
        <CursorArrow />
        <span>you</span>
      </div>

      <p
        className={styles.drawHint}
        data-shown={finished || undefined}
        aria-live="polite"
      >
        {finished && (
          <>
            <PencilIcon />
            {touched ? "Keep going, it’s yours" : "Your turn: draw on the pig"}
            <button
              type="button"
              onClick={() => (reducedMotion ? reset() : replay())}
            >
              {reducedMotion ? "Reset" : "Replay"}
            </button>
          </>
        )}
      </p>

      <div className={styles.layersCard} aria-hidden="true">
        <p className={styles.floatHead}>Layers</p>
        <ul className={styles.layers}>
          <li>
            <EyeIcon /> Sparkles
          </li>
          <li data-active="">
            <EyeIcon /> Pig
          </li>
          <li>
            <EyeIcon /> Background
          </li>
        </ul>
      </div>

      <div className={styles.dock} role="toolbar" aria-label="Drawing tools">
        {TOOLS.map(({ id, name, Icon }) => (
          <button
            key={id}
            type="button"
            className={styles.dockTool}
            data-target={`tool-${id}`}
            aria-label={name}
            aria-pressed={tool === id}
            onClick={() => {
              takeOver();
              setTool(id);
            }}
          >
            <Icon />
          </button>
        ))}
        <button
          type="button"
          className={styles.dockTool}
          data-mirror=""
          aria-label="Mirror drawing"
          aria-pressed={mirror}
          onClick={() => {
            takeOver();
            setMirror((on) => !on);
          }}
        >
          <MirrorIcon />
        </button>
        <span className={styles.dockDivider} />
        {SWATCHES.map((swatch) => (
          <button
            key={swatch.color}
            type="button"
            className={styles.swatch}
            style={{ background: swatch.color }}
            data-target={"target" in swatch ? swatch.target : undefined}
            aria-label={swatch.name}
            aria-pressed={color === swatch.color}
            onClick={() => {
              takeOver();
              setColor(swatch.color);
              if (settings.current.tool === "eraser") setTool("pencil");
            }}
          />
        ))}
      </div>
    </div>
  );
}
