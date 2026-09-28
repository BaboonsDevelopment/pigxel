import Link from "next/link";

export function Brand() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-2.5 rounded-sm text-xl font-bold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        className="size-7"
        fill="currentColor"
        shapeRendering="crispEdges"
      >
        <path d="M2 2h10v2h2v6h-2v2H6v4H2V2Zm4 4v2h4V6H6Z" />
      </svg>
      Pigxel
    </Link>
  );
}
