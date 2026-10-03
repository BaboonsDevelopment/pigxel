import { useEffect, useEffectEvent } from "react";

export function useShapeKeys(
  open: boolean,
  keys: { Enter: () => void; Escape: () => void },
) {
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.key !== "Enter" && e.key !== "Escape") return;
    e.preventDefault();
    e.stopImmediatePropagation();
    keys[e.key]();
  });
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => onKey(e);
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [open]);
}
