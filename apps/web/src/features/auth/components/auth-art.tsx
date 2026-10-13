import Image from "next/image";
import type { CSSProperties } from "react";
import { WALL_COLUMNS } from "@/features/landing/art";
import styles from "./auth-page.module.css";

const SPEEDS = [70, 88, 62, 80, 74, 94, 66, 84, 78, 90, 72];

// One column per speed, however many columns the landing wall has; repeats
// run in reverse so neighbours don't look alike. Each column loops through
// its cards twice, so one loop outlasts the panel's diagonal on big screens.
const COLUMNS = SPEEDS.map((_, index) => {
  const column = WALL_COLUMNS[index % WALL_COLUMNS.length] ?? [];
  const cards = index < WALL_COLUMNS.length ? column : [...column].reverse();
  return [...cards, ...cards];
});

export function AuthArt() {
  return (
    <div className={styles.art} aria-hidden="true">
      <div
        className={styles.artPlane}
        style={{ "--columns": COLUMNS.length } as CSSProperties}
      >
        {COLUMNS.map((column, index) => (
          <div
            key={index}
            className={styles.artColumn}
            data-direction={index % 2 ? "down" : "up"}
            style={{ "--speed": `${SPEEDS[index]}s` } as CSSProperties}
          >
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
