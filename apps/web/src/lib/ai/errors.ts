export type AiErrorCode = "overloaded" | "rate_limited" | "timeout" | "failed";

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
  failed: "Something went wrong with the AI. Try again.",
};

export function toUserMessage(e: unknown): string {
  return USER_MESSAGES[e instanceof AiError ? e.code : "failed"];
}

export function errorForStatus(status: number, detail: string): AiError {
  const message = `Gemini responded ${status}: ${detail}`;
  if (status === 429) return new AiError("rate_limited", message);
  if (status >= 500) return new AiError("overloaded", message);
  return new AiError("failed", message);
}
