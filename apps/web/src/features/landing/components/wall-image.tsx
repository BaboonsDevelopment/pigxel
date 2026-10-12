"use client";

import Image, { type StaticImageData } from "next/image";
import { useState } from "react";
import styles from "./landing.module.css";

/** A wall picture that fades in once it has loaded, instead of popping in. */
export function WallImage({
  src,
  sizes,
}: {
  src: StaticImageData;
  sizes: string;
}) {
  const [loaded, setLoaded] = useState(false);
  return (
    <Image
      src={src}
      alt=""
      sizes={sizes}
      loading="eager"
      draggable={false}
      className={styles.wallImage}
      data-loaded={loaded || undefined}
      onLoad={() => setLoaded(true)}
    />
  );
}
