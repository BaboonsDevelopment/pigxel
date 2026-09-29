/** A 16×16 icon drawn from rows of text, one "#" per filled pixel. */
export function pixelIcon(rows: string[], className = "size-5") {
  const d = rows
    .flatMap((row, y) =>
      [...row.matchAll(/#+/g)].map(
        (run) => `M${run.index} ${y}h${run[0].length}v1H${run.index}Z`,
      ),
    )
    .join("");
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className={className}
      fill="currentColor"
      shapeRendering="crispEdges"
    >
      <path d={d} />
    </svg>
  );
}
