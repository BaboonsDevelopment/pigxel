"use client";

import { useEffect, useRef, useState } from "react";

export function CountUp({
  to,
  from = 0,
  duration = 1400,
}: {
  to: number;
  from?: number;
  duration?: number;
}) {
  const [value, setValue] = useState(to);
  const element = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = element.current;
    if (
      !node ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      node.getBoundingClientRect().top < window.innerHeight
    )
      return;
    setValue(from);
    let frame = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 4);
          setValue(Math.round(from + (to - from) * eased));
          if (progress < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.6 },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [to, from, duration]);

  return (
    <span ref={element} style={{ fontVariantNumeric: "tabular-nums" }}>
      {value}
    </span>
  );
}
