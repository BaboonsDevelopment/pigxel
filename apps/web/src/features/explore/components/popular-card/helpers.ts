const compact = new Intl.NumberFormat("en", { notation: "compact" });

export function formatCount(count: number) {
  return compact.format(count).toLowerCase();
}
