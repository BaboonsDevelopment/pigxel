import type { CSSProperties } from "react";
import { ICONS, PixelSprite } from "./pixel-art";
import styles from "./landing.module.css";

const LAYERS: { icon: keyof typeof ICONS; name: string; active?: boolean }[] = [
  { icon: "star", name: "Sparkles" },
  { icon: "heart", name: "Pig", active: true },
  { icon: "tree", name: "Grass" },
];

// Sweetie 16, a few of its colours.
const SWATCHES = [
  "#1a1c2c",
  "#b13e53",
  "#ef7d57",
  "#ffcd75",
  "#a7f070",
  "#38b764",
  "#41a6f6",
  "#f4f4f4",
];

function Eye() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="12" cy="12" r="2.6" fill="currentColor" />
    </svg>
  );
}

function Card({
  name,
  delay,
  children,
}: {
  name: string;
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className={styles.floatCard}
      data-card={name}
      style={{ "--d": `${delay}s` } as CSSProperties}
    >
      <div className={styles.floatBody}>{children}</div>
    </div>
  );
}

/**
 * Small pieces of the editor floating around the hero, the way a product
 * shows itself at work. Decorative: the page says all of it in words.
 */
export function HeroCards() {
  return (
    <div className={styles.floats} aria-hidden="true">
      <Card name="layers" delay={1.35}>
        <p className={styles.floatHead}>
          Layers <span className={styles.floatMeta}>3</span>
        </p>
        <ul className={styles.layers}>
          {LAYERS.map((layer) => (
            <li key={layer.name} data-active={layer.active || undefined}>
              <Eye />
              <PixelSprite
                {...ICONS[layer.icon]}
                className={styles.layerIcon}
              />
              {layer.name}
            </li>
          ))}
        </ul>
      </Card>

      <Card name="ai" delay={1.5}>
        <p className={styles.floatHead}>
          AI helper <i className={styles.live} />
        </p>
        <p className={styles.floatAsk}>
          Make it night
          <span className={styles.caret} />
        </p>
        <p className={styles.floatDone}>
          <span className={styles.floatCheck}>✓</span> Recolored 214 pixels
        </p>
      </Card>

      <Card name="palette" delay={1.65}>
        <p className={styles.floatHead}>
          Palette <span className={styles.floatMeta}>Sweetie 16</span>
        </p>
        <div className={styles.swatches}>
          {SWATCHES.map((color, index) => (
            <span
              key={color}
              style={{ background: color }}
              data-active={index === 1 || undefined}
            />
          ))}
        </div>
      </Card>

      <Card name="export" delay={1.8}>
        <p className={styles.floatHead}>
          Export <span className={styles.floatMeta}>GIF</span>
        </p>
        <p className={styles.exportName}>
          <PixelSprite {...ICONS.film} className={styles.layerIcon} />
          pig-walk.gif
          <span className={styles.floatMeta}>12 frames</span>
        </p>
        <span className={styles.exportBar}>
          <span />
        </span>
      </Card>
    </div>
  );
}
