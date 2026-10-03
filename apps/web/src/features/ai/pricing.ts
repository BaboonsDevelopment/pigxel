type Price = { input: number; output: number; imageOutput?: number };

const PRICES: Record<string, Price> = {
  "gemini-3.7-flash": { input: 0.75, output: 3.75 },
  "gemini-3.6-flash": { input: 0.75, output: 3.75 },
  "gemini-3.1-flash-lite": { input: 0.25, output: 1.5 },
  "gemini-3.1-flash-image": { input: 0.5, output: 3, imageOutput: 60 },
  "gemini-3.1-flash-lite-image": { input: 0.25, output: 1.5, imageOutput: 30 },
  "gemini-2.5-flash-image": { input: 0.3, output: 2.5, imageOutput: 30 },
};

export type Tokens = {
  input: number;
  output: number;
  thinking: number;
  image: number;
};

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
