import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import gardenNight from "../../../../../public/art/feature/garden-night.png";
import { PAINT_FRAMES } from "../pixel-art";
import { PigPixels, PlayIcon } from "./icons";
import styles from "./feature-tour.module.css";

type Card = {
  format: string;
  file: string;
  note: string;
  preview: ReactNode;
};

const frames = (sizes: string, className: string | undefined) =>
  PAINT_FRAMES.map((frame, i) => (
    <span key={i} className={className} style={{ "--i": i } as CSSProperties}>
      <Image src={frame} alt="" sizes={sizes} />
    </span>
  ));

const CARDS: Card[] = [
  {
    format: "GIF",
    file: "painting.gif",
    note: "Loops forever",
    preview: (
      <div className={styles.gif}>{frames("160px", styles.gifFrame)}</div>
    ),
  },
  {
    format: "PNG",
    file: "garden.png",
    note: "Crisp pixels",
    preview: (
      <Image src={gardenNight} alt="" sizes="180px" className={styles.cover} />
    ),
  },
  {
    format: "Sheet",
    file: "painting-sheet.png",
    note: "For game engines",
    preview: (
      <div className={styles.sheet}>
        {PAINT_FRAMES.map((frame, i) => (
          <Image key={i} src={frame} alt="" sizes="48px" />
        ))}
      </div>
    ),
  },
  {
    format: "JSON",
    file: "painting.json",
    note: "Aseprite format",
    preview: (
      <pre className={styles.code}>
        <span data-k="">{"{"}</span>
        {"\n  "}
        <span data-s="">&quot;frames&quot;</span>: [{"\n    "}
        <span data-s="">&quot;paint 0&quot;</span>,{"\n    "}
        <span data-s="">&quot;paint 1&quot;</span>,{"\n    …"}
        {"\n  ],\n  "}
        <span data-s="">&quot;meta&quot;</span>: {"{"}
        {"\n    "}
        <span data-s="">&quot;app&quot;</span>:{" "}
        <span data-v="">&quot;Pigxel&quot;</span>
        {"\n  }\n"}
        <span data-k="">{"}"}</span>
      </pre>
    ),
  },
  {
    format: "Video",
    file: "timelapse.mp4",
    note: "How you drew it",
    preview: (
      <div className={styles.timelapse}>
        <PigPixels />
        <span className={styles.timelapsePlay}>
          <PlayIcon />
        </span>
      </div>
    ),
  },
];

/** Five ways out, fanned like a hand of cards over the night garden. */
export function ExportBoard() {
  const middle = (CARDS.length - 1) / 2;
  return (
    <div className={styles.exportBoard}>
      <p className={styles.exportStatus} aria-hidden="true">
        <span className={styles.exporting}>
          <i /> Exporting
        </span>
        <span className={styles.exported}>✓ Ready to share</span>
      </p>
      <ul
        className={styles.fan}
        aria-label="Export formats: a looping GIF, a PNG, a sprite sheet, Aseprite JSON for game engines and a timelapse video."
      >
        {CARDS.map((card, i) => (
          <li
            key={card.file}
            className={styles.fanCard}
            style={
              {
                "--i": i,
                "--o": i - middle,
              } as CSSProperties
            }
          >
            <div className={styles.fanInner}>
              <div className={styles.fanPreview}>{card.preview}</div>
              <p className={styles.fanMeta}>
                <span className={styles.format}>{card.format}</span>
                <span className={styles.fanFile}>{card.file}</span>
                <span className={styles.fanNote}>{card.note}</span>
              </p>
              <span className={styles.fanBar}>
                <span />
              </span>
              <span className={styles.fanDone} aria-hidden="true">
                ✓
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
