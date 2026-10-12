import Image from "next/image";
import type { CSSProperties } from "react";
import { PAINT_FRAMES } from "../pixel-art";
import { PauseIcon } from "./icons";
import styles from "./feature-tour.module.css";

const at = (i: number) => ({ "--i": i }) as CSSProperties;

/**
 * The pig painting a flower: her four frames play on the artboard, the frame
 * before shows faintly as onion skin, and the timeline below plays along.
 * Every loop is 2.4 s, 600 ms a frame, so the art, the timeline's highlight
 * and its playhead stay in step.
 */
export function AnimateBoard() {
  return (
    <div className={styles.animateBoard}>
      <div
        className={styles.animateArt}
        role="img"
        aria-label="The Pigxel pig painting a flower at an easel, frame by frame, with the frame before shown faintly as onion skin."
      >
        {PAINT_FRAMES.map((frame, i) => (
          <span key={`onion-${i}`} className={styles.onion} style={at(i)}>
            <Image src={frame} alt="" sizes="(max-width: 640px) 70vw, 380px" />
          </span>
        ))}
        {PAINT_FRAMES.map((frame, i) => (
          <span key={`frame-${i}`} className={styles.frame} style={at(i)}>
            <Image src={frame} alt="" sizes="(max-width: 640px) 70vw, 380px" />
          </span>
        ))}
      </div>

      <div className={styles.timeline} aria-hidden="true">
        <div className={styles.timelineHead}>
          <span className={styles.play}>
            <PauseIcon />
          </span>
          <span className={styles.timelineName}>painting.pigxel</span>
          <span className={styles.chip} data-on="">
            Onion skin
          </span>
          <span className={styles.chip}>Loop</span>
        </div>
        <div className={styles.track}>
          <span className={styles.tag}>paint</span>
          <div className={styles.cells}>
            {PAINT_FRAMES.map((frame, i) => (
              <span key={i} className={styles.cell} style={at(i)}>
                <span className={styles.cellDrop} style={at(i)}>
                  <Image src={frame} alt="" sizes="72px" />
                </span>
                <small>{i + 1}</small>
              </span>
            ))}
            <span className={styles.playhead} />
          </div>
        </div>
      </div>
    </div>
  );
}
