/** Whether two pictures have the same pixels. */
export function samePixels(a: ImageData, b: ImageData) {
  for (let i = 0; i < a.data.length; i++)
    if (a.data[i] !== b.data[i]) return false;
  return true;
}

/** iOS's own curve: quick to start, long gentle settle. */
const ZOOM_EASING = "cubic-bezier(0.32, 0.72, 0, 1)";

/**
 * Grows an open modal `dialog` out of the `from` box (e.g. the card it opens
 * from), or shrinks it back into it, like apps opening on iOS. The backdrop
 * fades along. Resolves once it has played; at once without `from` or when
 * the person prefers less motion.
 */
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
  const small = {
    transform: `translate(${dx}px, ${dy}px) scale(${from.width / to.width}, ${from.height / to.height})`,
  };
  const full = { transform: "none" };
  const opening = direction === "in";
  const options = {
    duration: opening ? 500 : 380,
    easing: ZOOM_EASING,
    fill: "forwards" as const,
  };
  const card = dialog.animate(
    opening
      ? [{ ...small, opacity: 0 }, { opacity: 1, offset: 0.25 }, full]
      : [full, { opacity: 1, offset: 0.75 }, { ...small, opacity: 0 }],
    options,
  );
  const backdrop = dialog.animate(
    { opacity: opening ? [0, 1] : [1, 0] },
    { ...options, pseudoElement: "::backdrop" },
  );
  return Promise.all([card.finished, backdrop.finished]).then(() => {
    // Back to the stylesheet once open, so nothing stays held by the animation.
    if (opening) {
      card.cancel();
      backdrop.cancel();
    }
  });
}
