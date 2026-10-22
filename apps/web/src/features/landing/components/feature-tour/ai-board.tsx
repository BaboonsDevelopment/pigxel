"use client";

import { useCallback, useEffect, useRef, type CSSProperties } from "react";
import gardenDay from "../../../../../public/art/wall/garden.png";
import gardenNight from "../../../../../public/art/feature/garden-night.png";
import { SendIcon, SparklesIcon } from "./icons";
import styles from "./feature-tour.module.css";

const PROMPT = "Make it night, with fireflies";

/** When the redraw starts and how long it takes, in ms from the start. */
const REDRAW_AT = 3300;
const REDRAW_MS = 1500;
const FLASH_MS = 160;
const COLS = 40;

/** Where the fireflies glow over the picture, in % of its size. */
const FIREFLIES: [number, number, number][] = [
  [14, 62, 0],
  [22, 44, 1.2],
  [31, 70, 0.5],
  [44, 58, 1.8],
  [52, 36, 0.9],
  [63, 66, 2.3],
  [71, 48, 0.3],
  [78, 72, 1.5],
  [86, 40, 2.6],
  [38, 30, 2],
  [92, 60, 1.1],
  [8, 38, 2.9],
];

function load(src: string) {
  const img = new Image();
  img.src = src;
  return img.decode().then(
    () => img,
    () => img,
  );
}

/**
 * Someone asks the AI helper to make the garden night. The prompt types
 * itself, the helper thinks, then the picture is redrawn block by block,
 * top to bottom, into the same garden at night, and fireflies come out.
 * The chat runs on CSS; the redraw runs here, on the same clock.
 */
export function AiBoard({
  active,
  reducedMotion,
  onNight,
}: {
  active: boolean;
  reducedMotion: boolean;
  /** Called as the garden turns to night, so the stage can follow. */
  onNight: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const scene = useRef<{
    images: [HTMLImageElement, HTMLImageElement] | null;
    progress: number;
    order: Float32Array;
    rows: number;
  }>({ images: null, progress: 0, order: new Float32Array(0), rows: 1 });

  const draw = useCallback(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    const { images, progress, order, rows } = scene.current;
    if (!el || !ctx || !images) return;
    const [day, night] = images;
    const w = el.width;
    const h = el.height;
    ctx.imageSmoothingQuality = "high";
    if (progress >= 1 + FLASH_MS / REDRAW_MS) {
      ctx.drawImage(night, 0, 0, w, h);
      return;
    }
    ctx.drawImage(day, 0, 0, w, h);
    if (progress <= 0) return;
    const bw = w / COLS;
    const bh = h / rows;
    const sw = day.naturalWidth / COLS;
    const sh = day.naturalHeight / rows;
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < COLS; c++) {
        const since = (progress - order[r * COLS + c]!) * REDRAW_MS;
        if (since < 0) continue;
        const x = Math.floor(c * bw);
        const y = Math.floor(r * bh);
        const dw = Math.ceil((c + 1) * bw) - x;
        const dh = Math.ceil((r + 1) * bh) - y;
        ctx.drawImage(night, c * sw, r * sh, sw, sh, x, y, dw, dh);
        if (since < FLASH_MS) {
          ctx.fillStyle = `rgb(255 255 255 / ${0.5 * (1 - since / FLASH_MS)})`;
          ctx.fillRect(x, y, dw, dh);
        }
      }
  }, []);

  // Size the canvas to its box and load both gardens.
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    let cancelled = false;
    const size = () => {
      const box = el.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      el.width = Math.max(1, Math.round(box.width * ratio));
      el.height = Math.max(1, Math.round(box.height * ratio));
      const rows = Math.max(1, Math.round((COLS * el.height) / el.width));
      // Each block's moment, 0–1: a top-to-bottom sweep with a ragged edge.
      const order = new Float32Array(COLS * rows);
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < COLS; c++) {
          const noise =
            Math.abs(Math.sin(c * 12.9898 + r * 78.233) * 43758.5453) % 1;
          order[r * COLS + c] = (r / rows) * 0.72 + noise * 0.28;
        }
      scene.current.rows = rows;
      scene.current.order = order;
      draw();
    };
    size();
    const observer = new ResizeObserver(size);
    observer.observe(el);
    void Promise.all([load(gardenDay.src), load(gardenNight.src)]).then(
      (images) => {
        if (cancelled) return;
        scene.current.images = images;
        draw();
      },
    );
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [draw]);

  // Each time the chapter starts, wait for the prompt, then redraw. Leaving
  // stops a redraw that hasn't started, and leaves the picture as it is.
  useEffect(() => {
    if (!active) return;
    if (reducedMotion) {
      scene.current.progress = 2;
      draw();
      onNight();
      return;
    }
    let frame = 0;
    const timer = window.setTimeout(() => {
      onNight();
      const start = performance.now();
      const step = (now: number) => {
        scene.current.progress = (now - start) / REDRAW_MS;
        draw();
        if (scene.current.progress < 1 + FLASH_MS / REDRAW_MS)
          frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
    }, REDRAW_AT);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  }, [active, draw, onNight, reducedMotion]);

  return (
    <div className={styles.aiBoard}>
      <div className={styles.aiArt}>
        <canvas
          ref={canvas}
          className={styles.aiCanvas}
          role="img"
          aria-label="A pixel-art Japanese garden with a red bridge and a koi pond, redrawn by the AI helper as the same garden at night, with glowing lanterns and fireflies."
        />
        <span className={styles.scan} aria-hidden="true" />
        <span className={styles.fireflies} aria-hidden="true">
          {FIREFLIES.map(([x, y, delay], i) => (
            <i
              key={i}
              style={
                {
                  left: `${x}%`,
                  top: `${y}%`,
                  "--d": `${delay}s`,
                } as CSSProperties
              }
            />
          ))}
        </span>
      </div>

      <div className={styles.chat} aria-hidden="true">
        <p className={styles.chatHead}>
          <SparklesIcon /> AI helper <i className={styles.live} />
        </p>
        <p className={styles.suggestions}>
          <span>Add falling snow</span>
          <span>Make it autumn</span>
          <span data-picked="">Night with fireflies</span>
        </p>
        <div className={styles.messages}>
          <p className={styles.bot}>What should I change?</p>
          <p className={styles.me}>{PROMPT}</p>
          <p className={styles.thinking}>
            <span>
              <i />
              <i />
              <i />
            </span>
            Redrawing your pixels
          </p>
          <div className={styles.reply}>
            <p className={styles.bot}>Here’s your garden at night.</p>
            <p className={styles.replyActions}>
              <span>Undo</span>
              <span>Keep</span>
            </p>
          </div>
        </div>
        <p className={styles.input}>
          <span className={styles.placeholder}>Ask for a change…</span>
          <span
            className={styles.typed}
            style={{ "--chars": PROMPT.length } as CSSProperties}
          >
            {PROMPT}
          </span>
          <span className={styles.send}>
            <SendIcon />
          </span>
        </p>
      </div>
    </div>
  );
}
