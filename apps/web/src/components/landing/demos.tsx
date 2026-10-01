import type { CSSProperties } from "react";
import { FLOWER, PIG_FRAMES, PigFrame, PixelSprite } from "./pixel-art";
import styles from "./demos.module.css";

const vars = (values: Record<string, string | number>) =>
  values as CSSProperties;

/** The title bar of a little app window. */
function WindowBar({ title, meta }: { title: string; meta: string }) {
  return (
    <div className={styles.bar}>
      <span className={styles.dots} aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span>{title}</span>
      <span>{meta}</span>
    </div>
  );
}

/** Frames on a timeline: the pig hops, with the last frame as onion skin. */
export function AnimateDemo() {
  return (
    <figure className={styles.window}>
      <WindowBar title="hop.pigxel" meta="4 frames · 5 fps" />
      <div className={styles.stage}>
        <div
          className={styles.preview}
          role="img"
          aria-label="Pigxel’s pig hopping and blinking, four frames on loop, with the previous frame shown faintly as onion skin."
        >
          {PIG_FRAMES.map((frame, index) => (
            <PigFrame
              key={index}
              {...frame}
              className={styles.frame}
              style={vars({ "--i": index })}
            />
          ))}
        </div>
        <span className={styles.chip}>
          <i aria-hidden="true" /> Onion skin on
        </span>
      </div>
      <div className={styles.timeline} aria-hidden="true">
        <span className={styles.play}>
          <svg viewBox="0 0 24 24">
            <path d="m8 5 11 7-11 7Z" fill="currentColor" />
          </svg>
        </span>
        {PIG_FRAMES.map((frame, index) => (
          <span
            key={index}
            className={styles.cell}
            style={vars({ "--i": index })}
          >
            <PigFrame {...frame} />
            <small>{index + 1}</small>
          </span>
        ))}
      </div>
    </figure>
  );
}

const petalCenter = { x: 7, y: 6 };

/** A chat asks for a change and the canvas beside it follows. */
export function AiDemo() {
  return (
    <div className={styles.aiGrid}>
      <figure className={styles.window}>
        <WindowBar title="flower.pigxel" meta="16 × 16" />
        <div className={styles.aiCanvas}>
          <div
            className={styles.aiGrid16}
            role="img"
            aria-label="A pixel flower whose pink petals turn blue after the request."
          >
            {FLOWER.flatMap((row, y) =>
              [...row].map((pixel, x) => {
                const distance = Math.hypot(
                  x - petalCenter.x,
                  y - petalCenter.y,
                );
                return (
                  <span
                    key={`${x}-${y}`}
                    data-pixel={pixel}
                    style={
                      pixel === "p"
                        ? vars({ "--d": `${Math.round(distance * 70)}ms` })
                        : undefined
                    }
                  />
                );
              }),
            )}
          </div>
        </div>
      </figure>
      <div className={styles.chat}>
        <div className={styles.chatHead}>
          <span className={styles.botIcon} aria-hidden="true">
            <PixelSprite
              rows={["..w..", ".lll.", "lkkkl", "lkwkl", ".lll."]}
              colors={{ l: "#a78bfa", k: "#2d2a32", w: "#ffffff" }}
            />
          </span>
          Pigxel AI
        </div>
        <ol className={styles.messages}>
          <li className={styles.userMessage}>Make the petals blue</li>
          {/* The typing dots and the reply share one slot, so nothing jumps. */}
          <li className={styles.reply}>
            <span className={styles.typing} aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span className={styles.botMessage}>
              Done! The petals are blue now. Want a darker outline too?
            </span>
          </li>
        </ol>
        <div className={styles.chatInput} aria-hidden="true">
          Ask for a change…
          <span>↑</span>
        </div>
      </div>
    </div>
  );
}

const FORMATS = [
  { name: "PNG", text: "The frame on screen, pixels kept sharp" },
  { name: "JPEG", text: "On the tile’s own background" },
  { name: "GIF", text: "Every frame, looping, with its timing" },
  { name: "Sheet", text: "Sprite sheet + Aseprite JSON for engines" },
];

/** A sprite sheet and the formats it can leave Pigxel in. */
export function ExportDemo() {
  return (
    <figure className={`${styles.window} ${styles.exportWindow}`}>
      <WindowBar title="Export…" meta="4 formats" />
      <div className={styles.sheet}>
        <div
          className={styles.sheetFrames}
          role="img"
          aria-label="A sprite sheet with the pig’s four hop frames in a row."
        >
          {PIG_FRAMES.map((frame, index) => (
            <PigFrame key={index} {...frame} />
          ))}
        </div>
        <span className={styles.sheetLabel}>hop-sheet.png · 4 × 1</span>
      </div>
      <ul className={styles.formats}>
        {FORMATS.map((format, index) => (
          <li key={format.name} style={vars({ "--i": index })}>
            <span className={styles.formatBadge}>{format.name}</span>
            <span>{format.text}</span>
          </li>
        ))}
      </ul>
      <div className={styles.scale} aria-hidden="true">
        <span>Scale</span>
        <span className={styles.scaleTrack}>
          <span />
        </span>
        <b>1–20×</b>
      </div>
    </figure>
  );
}
