export function samePixels(a: ImageData, b: ImageData) {
  for (let i = 0; i < a.data.length; i++)
    if (a.data[i] !== b.data[i]) return false;
  return true;
}

const OPEN = { duration: 650, easing: "cubic-bezier(0.16, 1, 0.3, 1)" };
const CLOSE = { duration: 520, easing: "cubic-bezier(0.4, 0, 0.2, 1)" };

export function zoomDialog(
  dialog: HTMLDialogElement,
  from: DOMRect | undefined,
  direction: "in" | "out",
): Promise<void> {
  if (!from || matchMedia("(prefers-reduced-motion: reduce)").matches)
    return Promise.resolve();
  const to = dialog.getBoundingClientRect();
  const dx = from.left + from.width / 2 - (to.left + to.width / 2);
  const dy = from.top + from.height / 2 - (to.top + to.height / 2);
  const small = `translate(${dx}px, ${dy}px) scale(${from.width / to.width})`;
  const opening = direction === "in";
  const timing = { ...(opening ? OPEN : CLOSE), fill: "forwards" as const };
  const move = dialog.animate(
    { transform: opening ? [small, "none"] : ["none", small] },
    timing,
  );
  const fade = dialog.animate(
    { opacity: opening ? [0, 1] : [1, 0] },
    {
      fill: "forwards",
      duration: timing.duration * (opening ? 0.45 : 0.7),
      delay: opening ? 0 : timing.duration * 0.3,
      easing: "ease-out",
    },
  );
  const backdrop = dialog.animate(
    { opacity: opening ? [0, 1] : [1, 0] },
    { ...timing, easing: "ease-out", pseudoElement: "::backdrop" },
  );
  const all = [move, fade, backdrop];
  return Promise.all(all.map((a) => a.finished)).then(() => {
    if (opening) all.forEach((a) => a.cancel());
  });
}
