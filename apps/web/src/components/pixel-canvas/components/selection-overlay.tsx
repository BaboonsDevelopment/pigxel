/** Dims the page while the user picks an area on the canvas. */
export function SelectionOverlay({ onCancel }: { onCancel: () => void }) {
  return (
    <div
      className="fixed inset-0 z-40 flex justify-center bg-black/60 pt-6"
      onPointerDown={onCancel}
    >
      <p className="h-fit rounded-lg bg-background px-4 py-2 text-sm shadow-lg">
        Drag over the canvas to choose where to draw ·{" "}
        <kbd className="font-sans text-muted-foreground">Esc</kbd> to cancel
      </p>
    </div>
  );
}
