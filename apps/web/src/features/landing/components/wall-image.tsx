"use client";

import Image, { type StaticImageData } from "next/image";
import styles from "./landing.module.css";

/**
 * A wall picture that fades in once it has loaded, instead of popping in.
 * The flag goes straight on the element: the wall has well over a hundred of
 * these, and none of them needs a React render to fade. Low priority keeps
 * them from competing with the hero while the page loads.
 */
export function WallImage({
  src,
  sizes,
}: {
  src: StaticImageData;
  sizes: string;
}) {
  return (
    <Image
      src={src}
      alt=""
      sizes={sizes}
      loading="eager"
      fetchPriority="low"
      draggable={false}
      className={styles.wallImage}
      onLoad={(event) => {
        event.currentTarget.dataset.loaded = "";
      }}
    />
  );
}
