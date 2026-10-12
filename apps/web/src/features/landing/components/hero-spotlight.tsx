"use client";

import { useEffect, useRef } from "react";
import styles from "./landing.module.css";

/**
 * Lights up the hero's pixel grid around the pointer. It follows the pointer
 * through CSS variables, so React never re-renders on move.
 */
export function HeroSpotlight() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    const hero = node?.parentElement;
    if (!node || !hero || !window.matchMedia("(pointer: fine)").matches) return;
    let frame = 0;
    const move = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const box = hero.getBoundingClientRect();
        node.style.setProperty("--x", `${event.clientX - box.left}px`);
        node.style.setProperty("--y", `${event.clientY - box.top}px`);
        node.dataset.active = "true";
      });
    };
    const leave = () => {
      cancelAnimationFrame(frame);
      delete node.dataset.active;
    };
    hero.addEventListener("pointermove", move);
    hero.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(frame);
      hero.removeEventListener("pointermove", move);
      hero.removeEventListener("pointerleave", leave);
    };
  }, []);

  return <div ref={ref} className={styles.spotlight} aria-hidden="true" />;
}
