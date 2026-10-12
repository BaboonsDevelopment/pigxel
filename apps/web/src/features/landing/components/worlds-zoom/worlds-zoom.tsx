"use client";

import Image from "next/image";
import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import skyIslands from "../../../../../public/art/feature/sky-islands-pig.png";
import { ART, type Art } from "../../art";
import styles from "./worlds-zoom.module.css";

const A = ART;
/** The worlds around the sky islands, in reading order; the islands sit in the middle. */
const AROUND: Art[] = [
  A.coast,
  A.shrine,
  A.oasis,
  A.night,
  A.reef,
  A.library,
  A.pirates,
  A.village,
  A.lighthouse,
  A.noodles,
  A.garden,
  A.treehouse,
  A.volcano,
  A.icecave,
];
/** Index of the middle tile, in both the 5 × 3 and the 3 × 5 grid. */
const MIDDLE = 7;
const TILES: (Art | null)[] = [
  ...AROUND.slice(0, MIDDLE),
  null,
  ...AROUND.slice(MIDDLE),
];

/** The sky islands are true pixel art: one file pixel is one art pixel. */
const IMG_W = 240;
const IMG_H = 161;
/** The pig standing on the little floating rock, where the zoom starts. */
const PIG = { x: 135, y: 91, height: 14 };

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const smooth = (t: number) => {
  const c = clamp01(t);
  return c * c * (3 - 2 * c);
};
const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;

const motionQuery = "(prefers-reduced-motion: reduce)";
const subscribeMotion = (callback: () => void) => {
  const media = window.matchMedia(motionQuery);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
};

/** An element's box inside `root`, from layout, ignoring transforms. */
function boxWithin(el: HTMLElement, root: HTMLElement) {
  let x = 0;
  let y = 0;
  let node: HTMLElement | null = el;
  while (node && node !== root) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight };
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/**
 * "A few pixels. Whole other worlds.": the section opens on a few giant
 * pixels, the Pigxel pig's face, and pulls back as you scroll, to the sky
 * islands she stands on, then to a gallery of worlds with hers in the middle.
 * Scroll position drives everything; nothing plays on its own.
 */
export function WorldsZoom({ header }: { header: ReactNode }) {
  const track = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const middle = useRef<HTMLLIElement>(null);
  const tiles = useRef<(HTMLLIElement | null)[]>([]);
  const navCard = useRef<HTMLDivElement>(null);
  const frameBox = useRef<HTMLSpanElement>(null);
  const thumb = useRef<HTMLSpanElement>(null);
  const reducedMotion = useSyncExternalStore(
    subscribeMotion,
    () => window.matchMedia(motionQuery).matches,
    () => false,
  );

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    const root = stage.current;
    if (!el || !ctx || !root) return;

    const img = new window.Image();
    img.src = skyIslands.src;
    let loaded = false;
    let frame = 0;
    let geometry: {
      w: number;
      h: number;
      ratio: number;
      cell: { x: number; y: number; w: number; h: number };
      tiles: { node: HTMLLIElement; dx: number; dy: number; d: number }[];
    } | null = null;

    const measure = () => {
      if (heading.current)
        root.style.setProperty(
          "--heading-height",
          `${heading.current.offsetHeight}px`,
        );
      const w = root.clientWidth;
      const h = root.clientHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      el.width = Math.round(w * ratio);
      el.height = Math.round(h * ratio);
      const cellNode = middle.current;
      if (!cellNode) return;
      const cell = boxWithin(cellNode, root);
      const cx = cell.x + cell.w / 2;
      const cy = cell.y + cell.h / 2;
      const placed = tiles.current.flatMap((node) => {
        if (!node) return [];
        const t = boxWithin(node, root);
        const dx = t.x + t.w / 2 - cx;
        const dy = t.y + t.h / 2 - cy;
        return [{ node, dx, dy, d: Math.hypot(dx, dy) }];
      });
      const far = Math.max(1, ...placed.map((t) => t.d));
      for (const t of placed) t.d /= far;
      geometry = { w, h, ratio, cell, tiles: placed };
    };

    const progress = () => {
      if (reducedMotion) return 1;
      const node = track.current;
      if (!node) return 0;
      const box = node.getBoundingClientRect();
      const span = Math.max(
        1,
        box.height - (viewport.current?.clientHeight ?? window.innerHeight),
      );
      return clamp01(-box.top / span);
    };

    let drawn = false;
    const draw = () => {
      frame = 0;
      if (!geometry) return;
      // Off screen there's nothing to update once it has been drawn.
      const span = track.current?.getBoundingClientRect();
      const view = viewport.current;
      if (span && view) {
        const height = view.clientHeight;
        const arrival = reducedMotion ? 1 : smooth(1 - span.top / height);
        // Meet the outgoing scene in the same screen coordinates. Only the
        // opacity changes until this section reaches its own sticky position.
        const offset = reducedMotion
          ? 0
          : Math.min(height, Math.max(0, span.top));
        view.style.setProperty("--arrival", arrival.toFixed(3));
        view.style.setProperty("--arrival-offset", `${offset.toFixed(2)}px`);
        view.toggleAttribute("data-arrived", arrival >= 0.99);
        view.inert = arrival < 0.99;
      }
      if (drawn && span && (span.bottom < 0 || span.top > window.innerHeight))
        return;
      drawn = loaded;
      const { w: W, h: H, ratio, cell } = geometry;
      const p = progress();
      const z = easeInOut(clamp01((p - 0.05) / 0.82));

      // Scale, in screen px per art pixel, eased in log space so every
      // stretch of scrolling zooms by the same factor.
      const s0 = (0.62 * H) / PIG.height;
      const s1 = cell.w / IMG_W;
      const s = Math.exp(Math.log(s0) + (Math.log(s1) - Math.log(s0)) * z);
      const iw = IMG_W * s;
      const ih = IMG_H * s;

      // Covering the stage, the picture keeps the pig centred without
      // showing past its edges; smaller, it glides into its tile.
      const axis = (
        stageSize: number,
        size: number,
        focus: number,
        cellStart: number,
        cellSize: number,
      ) => {
        if (size >= stageSize)
          return Math.min(0, Math.max(stageSize - size, stageSize / 2 - focus));
        const t = clamp01((stageSize - size) / (stageSize - cellSize || 1));
        const target = cellStart + cellSize / 2;
        return stageSize / 2 + (target - stageSize / 2) * t - size / 2;
      };
      const x = axis(W, iw, PIG.x * s, cell.x, cell.w);
      const y = axis(H, ih, PIG.y * s, cell.y, cell.h);

      // 0 while the picture still covers the stage, 1 once it's in its tile.
      const sCover = Math.max(W / IMG_W, H / IMG_H);
      const r = clamp01(
        (Math.log(sCover) - Math.log(s)) / (Math.log(sCover) - Math.log(s1)),
      );

      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, W, H);
      if (loaded) {
        ctx.save();
        if (r > 0) {
          const radius = 14 * r;
          ctx.shadowColor = `rgb(30 20 60 / ${0.32 * r})`;
          ctx.shadowBlur = 36 * r;
          ctx.shadowOffsetY = 14 * r;
          // Cast the shadow from a slightly smaller shape, so it never peeks
          // out along the picture's soft rounded edge.
          ctx.fillStyle = "#fff";
          roundRect(ctx, x + 3, y + 3, iw - 6, ih - 6, radius);
          ctx.fill();
          ctx.shadowColor = "transparent";
          roundRect(ctx, x, y, iw, ih, radius);
          ctx.clip();
        }
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, x, y, iw, ih);

        // Close up, show each pixel's edges, as the editor's grid does.
        if (s > 8) {
          const alpha = 0.22 * smooth((s - 8) / 10);
          const left = Math.max(0, Math.floor(-x / s));
          const right = Math.min(IMG_W, Math.ceil((W - x) / s));
          const top = Math.max(0, Math.floor(-y / s));
          const bottom = Math.min(IMG_H, Math.ceil((H - y) / s));
          ctx.beginPath();
          for (let i = left; i <= right; i++) {
            const gx = Math.round(x + i * s) + 0.5;
            ctx.moveTo(gx, Math.max(0, y));
            ctx.lineTo(gx, Math.min(H, y + ih));
          }
          for (let j = top; j <= bottom; j++) {
            const gy = Math.round(y + j * s) + 0.5;
            ctx.moveTo(Math.max(0, x), gy);
            ctx.lineTo(Math.min(W, x + iw), gy);
          }
          ctx.strokeStyle = `rgb(14 14 17 / ${alpha})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        ctx.restore();
      }

      // The other worlds come out from behind it, nearest first.
      for (const tile of geometry.tiles) {
        const k = smooth((r - 0.1 - 0.5 * tile.d) / 0.35);
        tile.node.style.opacity = k.toFixed(3);
        tile.node.style.transform =
          k >= 1
            ? ""
            : `translate(${(-tile.dx * 0.4 * (1 - k)).toFixed(1)}px, ${(-tile.dy * 0.4 * (1 - k)).toFixed(1)}px) scale(${(0.7 + 0.3 * k).toFixed(3)})`;
      }
      root.toggleAttribute("data-gallery", r > 0.97);
      const reveal = smooth((r - 0.12) / 0.5);
      viewport.current?.style.setProperty("--intro", reveal.toFixed(3));
      heading.current?.toggleAttribute("data-revealed", reveal > 0.01);

      // The navigator shows which part of the islands is on screen.
      const box = frameBox.current;
      if (box) {
        const vx = clamp01(-x / iw);
        const vy = clamp01(-y / ih);
        box.style.left = `${vx * 100}%`;
        box.style.top = `${vy * 100}%`;
        box.style.width = `${(clamp01((W - x) / iw) - vx) * 100}%`;
        box.style.height = `${(clamp01((H - y) / ih) - vy) * 100}%`;
      }
      if (navCard.current)
        navCard.current.style.opacity = (1 - smooth(r / 0.45)).toFixed(3);
      if (thumb.current) thumb.current.style.left = `${(1 - z) * 100}%`;
      viewport.current?.style.setProperty(
        "--fill",
        `${(smooth(z / 0.75) * 100).toFixed(1)}%`,
      );
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };

    measure();
    schedule();
    // decode() can reject for an image that did load; a broken one stays
    // undrawn, as drawImage would throw on every frame.
    const ready = () => {
      loaded = img.naturalWidth > 0;
      schedule();
    };
    img.decode().then(ready, ready);
    const observer = new ResizeObserver(() => {
      measure();
      schedule();
    });
    observer.observe(root);
    if (heading.current) observer.observe(heading.current);
    window.addEventListener("scroll", schedule, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
    };
  }, [reducedMotion]);

  return (
    <div ref={track} className={styles.track}>
      <div ref={viewport} className={styles.viewport}>
        <div ref={heading} className={styles.heading}>
          {header}
        </div>
        <div ref={stage} className={styles.stage}>
          <div className={styles.gallery}>
            <ul className={styles.grid} aria-label="Worlds made of pixels">
              {TILES.map((art, i) =>
                art ? (
                  <li
                    key={art.name}
                    ref={(node) => {
                      tiles.current[i] = node;
                    }}
                    className={styles.tile}
                  >
                    <Image
                      src={art.image}
                      alt={art.alt}
                      sizes="(max-width: 640px) 34vw, 20vw"
                    />
                    <span className={styles.caption}>
                      <strong>{art.name}</strong> AI art study
                    </span>
                  </li>
                ) : (
                  <li key="sky" ref={middle} className={styles.middle}>
                    <span className="sr-only">
                      Sky islands, a pixel-art world of floating islands with a
                      windmill and waterfalls, where the Pigxel pig stands on a
                      tiny floating rock. AI art study.
                    </span>
                    <span className={styles.caption} aria-hidden="true">
                      <strong>Sky islands</strong> Find the pig
                    </span>
                  </li>
                ),
              )}
            </ul>
          </div>

          <canvas ref={canvas} className={styles.canvas} aria-hidden="true" />

          <div className={styles.zoom} aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <circle cx="10.5" cy="10.5" r="6.5" />
              <path d="m20 20-4.5-4.5M7.5 10.5h6" />
            </svg>
            <span className={styles.slider}>
              <span ref={thumb} />
            </span>
            <svg viewBox="0 0 24 24">
              <circle cx="10.5" cy="10.5" r="6.5" />
              <path d="m20 20-4.5-4.5M7.5 10.5h6M10.5 7.5v6" />
            </svg>
            <span className={styles.file}>sky-islands.pigxel</span>
          </div>

          <div ref={navCard} className={styles.navigator} aria-hidden="true">
            <p>Navigator</p>
            <span className={styles.map}>
              <Image src={skyIslands} alt="" unoptimized />
              <span ref={frameBox} className={styles.frame} />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
