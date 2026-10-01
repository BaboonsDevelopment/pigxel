/**
 * The page numbers to show: the first, the last, and two either side of the
 * current one, with null where pages are skipped. E.g. 1 … 4 5 6 7 8 … 20.
 */
export function pageNumbers(page: number, pages: number): (number | null)[] {
  const shown = new Set([1, pages]);
  for (let n = page - 2; n <= page + 2; n++)
    if (n >= 1 && n <= pages) shown.add(n);
  const sorted = [...shown].sort((a, b) => a - b);
  return sorted.flatMap((n, i) =>
    i > 0 && n - sorted[i - 1]! > 1 ? [null, n] : [n],
  );
}
