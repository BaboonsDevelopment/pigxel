type AiErrorCode =
  | "overloaded"
  | "rate_limited"
  | "timeout"
  | "unavailable"
  | "denied"
  | "no_credits"
  | "failed";

/** A provider failure with a reason the user can be told. */
export class AiError extends Error {
  constructor(
    readonly code: AiErrorCode,
    message: string,
  ) {
    super(message);
  }
}

const USER_MESSAGES: Record<AiErrorCode, string> = {
  overloaded: "The AI model is overloaded right now. Try again in a minute.",
  rate_limited: "Too many requests to the AI. Wait a moment and try again.",
  timeout: "The AI took too long to answer. Try again.",
  unavailable: "The AI model isn’t available. Check the model settings.",
  denied:
    "The AI refused the API key. Check the key and the account’s access and billing.",
  no_credits: "You’ve used all your AI tokens.",
  failed: "Something went wrong with the AI. Try again.",
};

export function toUserMessage(e: unknown): string {
  return USER_MESSAGES[e instanceof AiError ? e.code : "failed"];
}

export function errorForStatus(
  provider: string,
  status: number,
  detail: string,
): AiError {
  const message = `${provider} responded ${status}: ${detail}`;
  if (status === 401 || status === 403) return new AiError("denied", message);
  if (status === 404) return new AiError("unavailable", message);
  if (status === 429) return new AiError("rate_limited", message);
  if (status >= 500) return new AiError("overloaded", message);
  return new AiError("failed", message);
}

/**
 * Whether another model may succeed where this one failed: it is busy, too
 * slow, or this account can't use it.
 */
export function canTryAnother(e: unknown): boolean {
  return (
    e instanceof AiError &&
    (e.code === "overloaded" ||
      e.code === "rate_limited" ||
      e.code === "timeout" ||
      e.code === "unavailable")
  );
}
