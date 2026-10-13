import "server-only";
import { AiError } from "./errors";

const TIMEOUT_MS = 5000;
const MAX_PROMPT = 4000;

type Env = Partial<Record<string, string>>;

function moderationUrl(key: string) {
  const host = key.startsWith("creem_test_")
    ? "https://test-api.creem.io"
    : "https://api.creem.io";
  return `${host}/v1/moderation/prompt`;
}

/**
 * Screens what the person typed with Creem's Moderation API before any model
 * sees it. Fails closed: if Creem can't answer, nothing is generated.
 */
export async function moderate(
  texts: string[],
  userId?: string,
  env: Env = process.env,
  fetcher: typeof fetch = fetch,
) {
  const prompt = texts
    .map((t) => t.trim())
    .filter(Boolean)
    .join("\n")
    .slice(0, MAX_PROMPT);
  if (!prompt) return;

  const key = env.CREEM_API_KEY;
  if (!key) {
    if (env.NODE_ENV !== "production") return;
    throw new AiError("moderation", "Set CREEM_API_KEY to screen AI prompts.");
  }

  let decision: unknown;
  try {
    const response = await fetcher(moderationUrl(key), {
      method: "POST",
      headers: { "x-api-key": key, "content-type": "application/json" },
      body: JSON.stringify({
        prompt,
        ...(userId && { external_id: userId }),
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok)
      throw new Error(`Creem moderation responded ${response.status}`);
    decision = ((await response.json()) as { decision?: unknown }).decision;
  } catch (e) {
    throw new AiError(
      "moderation",
      `Couldn’t screen the prompt: ${e instanceof Error ? e.message : e}`,
    );
  }
  if (decision !== "allow")
    throw new AiError("blocked", `Prompt moderation decision: ${decision}`);
}
