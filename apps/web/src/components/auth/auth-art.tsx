import Image from "next/image";
import type { CSSProperties } from "react";
import { WALL_COLUMNS } from "@/components/landing/art";
import styles from "./auth-page.module.css";

/** Seconds per loop for each column; uneven so they never line up. */
const SPEEDS = [70, 88, 62, 80, 74, 94, 66, 84, 78];

/** Enough columns to cover the half-screen once tilted. */
const COLUMNS = [...WALL_COLUMNS, ...WALL_COLUMNS.slice(0, 3).reverse()];

/**
 * The sign-in pages' right half: the landing's art, tilted and drifting in
 * columns, the way Mobbin shows its screens beside its login. Decorative.
 */
export function AuthArt() {
  return (
    <div className={styles.art} aria-hidden="true">
      <div className={styles.artPlane}>
        {COLUMNS.map((column, index) => (
          <div
            key={index}
            className={styles.artColumn}
            data-direction={index % 2 ? "down" : "up"}
            style={{ "--speed": `${SPEEDS[index]}s` } as CSSProperties}
          >
            {/* Two copies, so the loop joins without a seam. */}
            {[...column, ...column].map((art, card) => (
              <div
                key={card}
                className={styles.artCard}
                data-sprite={art.tint ? true : undefined}
                style={art.tint ? { backgroundColor: art.tint } : undefined}
              >
                <Image src={art.image} alt="" sizes="160px" draggable={false} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
