export function PixelFolder({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 20"
      shapeRendering="crispEdges"
      className={className}
    >
      <path d="M1 2h9l2 2h11v15H1Z" className="fill-undo-surface" />
      <path d="M2 3h7l2 2h11v13H2Z" className="fill-primary-soft" />
      <path d="M2 7h20v11H2Z" className="fill-pastel-pink" />
    </svg>
  );
}
