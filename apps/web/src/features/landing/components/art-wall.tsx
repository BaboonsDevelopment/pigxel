import type { CSSProperties } from "react";
import { WALL_COLUMNS, type Art } from "../art";
import styles from "./landing.module.css";
import { WallImage } from "./wall-image";

const SPEEDS = [46, 58, 40, 52, 44, 62, 50, 56];

/**
 * Each column repeats its pictures three times and drifts by one repeat,
 * staying inside the middle one. That keeps a full set of pictures above and
 * below the visible part, so cards only ever arrive through the faded edges.
 */
const REPEATS = 3;

function WallCard({ art }: { art: Art }) {
  return art.tint ? (
    <div
      className={`${styles.wallCard} ${styles.wallSprite}`}
      style={{ backgroundColor: art.tint }}
    >
      <WallImage src={art.image} sizes="220px" />
    </div>
  ) : (
    <div className={styles.wallCard}>
      <WallImage src={art.image} sizes="260px" />
    </div>
  );
}

export function ArtWall() {
  return (
    <div className={styles.wall} aria-hidden="true">
      <div
        className={styles.wallPlane}
        style={{ "--columns": WALL_COLUMNS.length } as CSSProperties}
      >
        {WALL_COLUMNS.map((column, index) => (
          <div
            key={index}
            className={styles.wallColumn}
            data-direction={index % 2 ? "down" : "up"}
            style={
              {
                "--speed": `${SPEEDS[index % SPEEDS.length]}s`,
              } as CSSProperties
            }
          >
            {Array.from({ length: REPEATS }, () => column)
              .flat()
              .map((art, card) => (
                <WallCard key={card} art={art} />
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}
