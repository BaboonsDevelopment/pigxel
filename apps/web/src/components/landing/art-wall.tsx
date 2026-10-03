import Image from "next/image";
import type { CSSProperties } from "react";
import { WALL_COLUMNS, type Art } from "./art";
import styles from "./landing.module.css";

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
            {[...column, ...column].map((art, card) => (
              <WallCard key={card} art={art} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
