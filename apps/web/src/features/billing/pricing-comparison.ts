export type PriceQuote = {
  formattedTotal: string;
  total: string;
  currencyCode: string;
};

export function annualComparison(
  monthly: PriceQuote | undefined,
  annual: PriceQuote | undefined,
  locale?: string,
) {
  if (!monthly || !annual || monthly.currencyCode !== annual.currencyCode)
    return undefined;
  if (!/^\d+$/.test(monthly.total) || !/^\d+$/.test(annual.total))
    return undefined;

  const regularTotal = Number(monthly.total) * 12;
  const annualTotal = Number(annual.total);
  if (
    !Number.isSafeInteger(regularTotal) ||
    !Number.isSafeInteger(annualTotal) ||
    regularTotal <= 0 ||
    annualTotal >= regularTotal
  )
    return undefined;

  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: monthly.currencyCode,
  });
  const precision = formatter.resolvedOptions().maximumFractionDigits ?? 2;
  return {
    regularPrice: formatter.format(regularTotal / 10 ** precision),
    savingsPercent: Math.floor(
      ((regularTotal - annualTotal) / regularTotal) * 100,
    ),
  };
}
