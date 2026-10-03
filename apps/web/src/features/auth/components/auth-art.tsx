import Image from "next/image";
import type { CSSProperties } from "react";
import { WALL_COLUMNS } from "@/components/landing/art";
import styles from "./auth-page.module.css";

const SPEEDS = [70, 88, 62, 80, 74, 94, 66, 84, 78];

const COLUMNS = [...WALL_COLUMNS, ...WALL_COLUMNS.slice(0, 3).reverse()];

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
