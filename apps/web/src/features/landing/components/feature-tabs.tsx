"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import styles from "./landing.module.css";

type Feature = {
  id: string;
  title: string;
  text: string;
  panel: ReactNode;
};

const reducedMotionQuery = "(prefers-reduced-motion: reduce)";
function subscribeMotion(callback: () => void) {
  const media = window.matchMedia(reducedMotionQuery);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

export function FeatureTabs({ features }: { features: Feature[] }) {
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [inView, setInView] = useState(false);
  const reducedMotion = useSyncExternalStore(
    subscribeMotion,
    () => window.matchMedia(reducedMotionQuery).matches,
    () => true,
  );
  const root = useRef<HTMLDivElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const id = useId();
  const cycling = auto && !reducedMotion;

  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(Boolean(entry?.isIntersecting)),
      { threshold: 0.35 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  function choose(index: number, focus = false) {
    const next = (index + features.length) % features.length;
    setAuto(false);
    setActive(next);
    if (focus) tabs.current[next]?.focus();
  }

  function onKeyDown(event: KeyboardEvent) {
    const moves: Record<string, number> = {
      ArrowDown: active + 1,
      ArrowRight: active + 1,
      ArrowUp: active - 1,
      ArrowLeft: active - 1,
      Home: 0,
      End: features.length - 1,
    };
    const target = moves[event.key];
    if (target === undefined) return;
    event.preventDefault();
    choose(target, true);
  }

  return (
    <div
      ref={root}
      className={styles.tabs}
      data-running={cycling && inView && !hovered}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        role="tablist"
        aria-label="Features"
        aria-orientation="vertical"
        className={styles.tabList}
        onKeyDown={onKeyDown}
      >
        {features.map((feature, index) => (
          <button
            key={feature.id}
            ref={(node) => {
              tabs.current[index] = node;
            }}
            type="button"
            role="tab"
            id={`${id}-tab-${feature.id}`}
            aria-selected={index === active}
            aria-controls={`${id}-panel-${feature.id}`}
            tabIndex={index === active ? 0 : -1}
            className={styles.tab}
            onClick={() => choose(index)}
          >
            <span className={styles.tabTitle}>
              <span className={styles.tabNumber}>0{index + 1}</span>
              {feature.title}
            </span>
            <span className={styles.tabText}>
              <span>{feature.text}</span>
            </span>
            {index === active && cycling && (
              <span className={styles.tabProgress} aria-hidden="true">
                <span
                  key={active}
                  onAnimationEnd={() =>
                    setActive((current) => (current + 1) % features.length)
                  }
                />
              </span>
            )}
          </button>
        ))}
      </div>
      <div
        className={styles.tabPanels}
        onPointerDown={() => setAuto(false)}
        onFocusCapture={() => setAuto(false)}
      >
        {features.map((feature, index) => (
          <div
            key={feature.id}
            role="tabpanel"
            id={`${id}-panel-${feature.id}`}
            aria-labelledby={`${id}-tab-${feature.id}`}
            hidden={index !== active}
            className={styles.tabPanel}
          >
            {feature.panel}
          </div>
        ))}
      </div>
    </div>
  );
}
