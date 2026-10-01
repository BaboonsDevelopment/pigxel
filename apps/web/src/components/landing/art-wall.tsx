import Image from "next/image";
import type { CSSProperties } from "react";
import { WALL_COLUMNS, type Art } from "./art";
import styles from "./landing.module.css";

/** Seconds each column takes to loop once; uneven so the wall never syncs. */
const SPEEDS = [46, 58, 40, 52, 44, 62];

function WallCard({ art }: { art: Art }) {
  return art.tint ? (
    <div
      className={`${styles.wallCard} ${styles.wallSprite}`}
      style={{ backgroundColor: art.tint }}
    >
      <Image src={art.image} alt="" sizes="220px" draggable={false} />
    </div>
  ) : (
    <div className={styles.wallCard}>
      <Image src={art.image} alt="" sizes="260px" draggable={false} />
    </div>
  );
}

/**
 * The hero's tilted wall of art: columns drifting up and down at their own
 * pace, the way Mobbin shows its library. Pure CSS: it pauses on hover and
 * holds still for people who prefer reduced motion. Decorative only.
 */
export function ArtWall() {
  return (
    <div className={styles.wall} aria-hidden="true">
      <div className={styles.wallPlane}>
        {WALL_COLUMNS.map((column, index) => (
          <div
            key={index}
            className={styles.wallColumn}
            data-direction={index % 2 ? "down" : "up"}
            style={{ "--speed": `${SPEEDS[index]}s` } as CSSProperties}
          >
            {/* Two copies, so the loop joins without a seam. */}
            {[...column, ...column].map((art, card) => (
              <WallCard key={card} art={art} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
