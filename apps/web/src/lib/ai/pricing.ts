/**
 * Gemini API paid-tier prices in US dollars per 1M tokens, from
 * ai.google.dev/gemini-api/docs/pricing (checked 2026-10-01). Thinking is
 * billed as text output. Update this when Google changes its prices.
 */
type Price = { input: number; output: number; imageOutput?: number };

const PRICES: Record<string, Price> = {
  // Doubles from 2027-01-01 ($1.50 in, $7.50 out).
  "gemini-3.7-flash": { input: 0.75, output: 3.75 },
  "gemini-3.6-flash": { input: 0.75, output: 3.75 },
  "gemini-3.1-flash-lite": { input: 0.25, output: 1.5 },
  // A 512 picture is 747 tokens ($0.045), a 1K one 1120 ($0.067).
  "gemini-3.1-flash-image": { input: 0.5, output: 3, imageOutput: 60 },
  // A 1K picture is 1120 tokens ($0.0336).
  "gemini-3.1-flash-lite-image": { input: 0.25, output: 1.5, imageOutput: 30 },
  // $0.039 a picture of 1290 tokens; text output priced as 2.5 Flash.
  "gemini-2.5-flash-image": { input: 0.3, output: 2.5, imageOutput: 30 },
};

/** Tokens of one request, as recorded. */
export type Tokens = {
  input: number;
  /** Text output, without thinking. */
  output: number;
  thinking: number;
  image: number;
};

/** What a request cost in dollars, or null for a model with no known price. */
export function costOf(model: string, tokens: Tokens): number | null {
  const price = PRICES[model];
  if (!price) return null;
  return (
    (tokens.input * price.input +
      (tokens.output + tokens.thinking) * price.output +
      tokens.image * (price.imageOutput ?? price.output)) /
    1_000_000
  );
}
