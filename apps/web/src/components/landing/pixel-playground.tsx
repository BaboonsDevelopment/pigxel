"use client";

import { useRef, useState, type PointerEvent } from "react";
import { FLOWER } from "./pixel-art";
import styles from "./pixel-playground.module.css";

const palette = [
  { name: "Rose", color: "#d06a88" },
  { name: "Blush", color: "#edb3c5" },
  { name: "Butter", color: "#e7be5f" },
  { name: "Leaf", color: "#71927a" },
  { name: "Forest", color: "#34594d" },
  { name: "Ink", color: "#343330" },
];
const size = 16;
function initialPixels() {
  const colors: Record<string, string> = {
    p: "#d06a88",
    y: "#e7be5f",
    g: "#71927a",
  };
  return FLOWER.flatMap((row) => [...row].map((pixel) => colors[pixel] ?? ""));
}

export function PixelPlayground() {
  const [pixels, setPixels] = useState(initialPixels);
  const [color, setColor] = useState(palette[0]!.color);
  const [erasing, setErasing] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [status, setStatus] = useState("A little flower, a place to start.");
  const grid = useRef<HTMLDivElement>(null);
  const lastPixel = useRef<number | null>(null);
  const painting = useRef(false);

  function paint(index: number) {
    setPixels((previous) => {
      const next = [...previous];
      next[index] = erasing ? "" : color;
      return next;
    });
  }

  function paintPointer(event: PointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = Math.floor(((event.clientX - bounds.left) / bounds.width) * size);
    const y = Math.floor(((event.clientY - bounds.top) / bounds.height) * size);
    if (x < 0 || x >= size || y < 0 || y >= size) {
      lastPixel.current = null;
      return;
    }
    const index = y * size + x;
    const previous = lastPixel.current;
    const fromX = previous === null ? x : previous % size;
    const fromY = previous === null ? y : Math.floor(previous / size);
    const steps = Math.max(Math.abs(x - fromX), Math.abs(y - fromY), 1);
    setPixels((old) => {
      const next = [...old];
      for (let step = 0; step <= steps; step++) {
        const px = Math.round(fromX + ((x - fromX) * step) / steps);
        const py = Math.round(fromY + ((y - fromY) * step) / steps);
        next[py * size + px] = erasing ? "" : color;
      }
      return next;
    });
    lastPixel.current = index;
    setCursor(index);
  }

  function download() {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size * 20;
    const context = canvas.getContext("2d");
    if (!context) {
      setStatus("Your browser could not export this drawing.");
      return;
    }
    pixels.forEach((pixel, index) => {
      if (!pixel) return;
      context.fillStyle = pixel;
      context.fillRect(
        (index % size) * 20,
        Math.floor(index / size) * 20,
        20,
        20,
      );
    });
    const link = document.createElement("a");
    link.download = "my-little-pigxel.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
    setStatus("Your little masterpiece, ready to keep.");
  }

  return (
    <div className={styles.playground}>
      <div className={styles.playgroundTop}>
        <span>
          <i />
          <i />
          <i />
        </span>
        <span>little-something.pigxel</span>
        <span>16 × 16</span>
      </div>
      <div className={styles.playgroundBody}>
        <div className={styles.tools} aria-label="Drawing tools">
          <button
            type="button"
            aria-label="Pencil"
            aria-pressed={!erasing}
            onClick={() => setErasing(false)}
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="m5 15-1 5 5-1L20 8l-4-4L5 15Zm8-8 4 4M5 15l4 4"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Eraser"
            aria-pressed={erasing}
            onClick={() => setErasing(true)}
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="m4 14 9-10 7 7-9 10H9l-5-5v-2Zm4-4 7 7M11 21h10"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
          </button>
          <span />
          <button
            type="button"
            aria-label="Reset drawing to flower"
            onClick={() => {
              setPixels(initialPixels());
              setStatus("A fresh flower. A fresh start.");
            }}
          >
            ↺
          </button>
          <button
            type="button"
            aria-label="Clear canvas"
            onClick={() => {
              setPixels(Array<string>(size * size).fill(""));
              setStatus("A blank canvas. Anything goes.");
            }}
          >
            ×
          </button>
        </div>
        <div className={styles.canvasArea}>
          <div
            ref={grid}
            className={styles.pixelGrid}
            role="group"
            aria-label="Interactive 16 by 16 pixel canvas"
            aria-describedby="canvas-instructions"
            data-erasing={erasing}
            onPointerDown={(event) => {
              if (event.button !== 0) return;
              event.preventDefault();
              painting.current = true;
              lastPixel.current = null;
              event.currentTarget.setPointerCapture(event.pointerId);
              paintPointer(event);
            }}
            onPointerMove={(event) => {
              if (painting.current) paintPointer(event);
            }}
            onPointerUp={() => {
              painting.current = false;
              lastPixel.current = null;
            }}
            onPointerCancel={() => {
              painting.current = false;
              lastPixel.current = null;
            }}
            onLostPointerCapture={() => {
              painting.current = false;
              lastPixel.current = null;
            }}
            onKeyDown={(event) => {
              const offsets: Record<string, number> = {
                ArrowRight: 1,
                ArrowLeft: -1,
                ArrowDown: size,
                ArrowUp: -size,
              };
              const offset = offsets[event.key];
              if (offset !== undefined) {
                event.preventDefault();
                const next = Math.max(
                  0,
                  Math.min(size * size - 1, cursor + offset),
                );
                setCursor(next);
                (
                  grid.current?.children[next] as HTMLButtonElement | undefined
                )?.focus();
              }
            }}
          >
            {pixels.map((pixel, index) => (
              <button
                key={index}
                type="button"
                tabIndex={cursor === index ? 0 : -1}
                aria-label={`Row ${Math.floor(index / size) + 1}, column ${(index % size) + 1}, ${pixel ? (palette.find((item) => item.color === pixel)?.name ?? "colored") : "empty"}`}
                style={{ backgroundColor: pixel || undefined }}
                onFocus={() => setCursor(index)}
                onClick={(event) => {
                  if (event.detail === 0) paint(index);
                }}
              />
            ))}
          </div>
          <p id="canvas-instructions">
            Click or drag to draw. Arrow keys to move; space to paint.
          </p>
        </div>
      </div>
      <div className={styles.playgroundBottom}>
        <div className={styles.paintColors} aria-label="Paint colors">
          {palette.map((item) => (
            <button
              key={item.name}
              type="button"
              aria-label={`${item.name} paint`}
              aria-pressed={color === item.color && !erasing}
              style={{ backgroundColor: item.color }}
              onClick={() => {
                setColor(item.color);
                setErasing(false);
              }}
            />
          ))}
        </div>
        <button type="button" onClick={download} className={styles.saveArt}>
          Keep it <span aria-hidden="true">↓</span>
        </button>
      </div>
      <p className={styles.canvasStatus} role="status">
        {status}
      </p>
    </div>
  );
}
