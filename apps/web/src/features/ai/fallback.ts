import { AiError, canTryAnother } from "./errors";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function tryModels<T>(
  models: string[],
  attempt: (model: string) => Promise<T>,
  delays: number[],
): Promise<T> {
  for (let round = 0; ; round++) {
    let last: unknown;
    for (const model of models) {
      try {
        return await attempt(model);
      } catch (e) {
        if (!canTryAnother(e)) throw e;
        console.warn(`[ai] ${model} unavailable, trying the next one`);
        last = e;
      }
    }
    const delay = delays[round];
    if (delay === undefined) throw last;
    await sleep(delay);
  }
}

export async function fetchWithin(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  try {
    return await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    const timedOut = e instanceof Error && e.name === "TimeoutError";
    throw new AiError(timedOut ? "timeout" : "failed", String(e));
  }
}
