import { describe, expect, it } from "vitest";
import { annualComparison, type PriceQuote } from "@/lib/pricing-comparison";

function quote(total: string, currencyCode = "USD"): PriceQuote {
  return { total, currencyCode, formattedTotal: "Paddle-formatted price" };
}

describe("annual price comparisons", () => {
  it("compares the annual bill with twelve monthly bills", () => {
    expect(annualComparison(quote("1000"), quote("9600"), "en-US")).toEqual({
      regularPrice: "$120.00",
      savingsPercent: 20,
    });
  });
  it("handles zero-decimal currencies", () => {
    expect(
      annualComparison(quote("1000", "JPY"), quote("10000", "JPY"), "en-US"),
    ).toEqual({
      regularPrice: "¥12,000",
      savingsPercent: 16,
    });
  });
  it("handles three-decimal currencies", () => {
    expect(
      annualComparison(quote("1000", "KWD"), quote("9600", "KWD"), "en-US")
        ?.regularPrice,
    ).toBe("KWD 12.000");
  });
  it("formats the comparison for the visitor's locale without parsing display text", () => {
    expect(
      annualComparison(quote("1299", "EUR"), quote("12000", "EUR"), "de-DE")
        ?.regularPrice,
    ).toBe("155,88 €");
  });
  it("does not claim savings for equal or more expensive annual prices", () => {
    expect(annualComparison(quote("1000"), quote("12000"))).toBeUndefined();
    expect(annualComparison(quote("1000"), quote("13000"))).toBeUndefined();
  });
  it("does not compare missing quotes or different currencies", () => {
    expect(annualComparison(undefined, quote("1000"))).toBeUndefined();
    expect(annualComparison(quote("1000"), undefined)).toBeUndefined();
    expect(
      annualComparison(quote("1000"), quote("9600", "EUR")),
    ).toBeUndefined();
  });
  it("rejects invalid totals and a zero monthly rate", () => {
    for (const total of ["0", "-5", "NaN", "1.5", "", "9007199254740991"]) {
      expect(annualComparison(quote(total), quote("10"))).toBeUndefined();
    }
    expect(annualComparison(quote("1000"), quote("-1"))).toBeUndefined();
  });
  it("does not round up savings claims", () => {
    expect(
      annualComparison(quote("1000"), quote("10000"))?.savingsPercent,
    ).toBe(16);
  });
});
