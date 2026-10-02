import "server-only";
import { createClient } from "@/lib/supabase/server";
import { costOf, type Tokens } from "./pricing";

/** What Gemini reports a request used, as `usageMetadata` on its answer. */
export type GeminiUsage = {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  thoughtsTokenCount?: number;
  candidatesTokensDetails?: { modality?: string; tokenCount?: number }[];
};

/** The tokens of one answer, image output apart from text. */
function tokensOf(usage: GeminiUsage): Tokens {
  const image =
    usage.candidatesTokensDetails
      ?.filter((d) => d.modality === "IMAGE")
      .reduce((sum, d) => sum + (d.tokenCount ?? 0), 0) ?? 0;
  return {
    input: usage.promptTokenCount ?? 0,
    output: Math.max(0, (usage.candidatesTokenCount ?? 0) - image),
    thinking: usage.thoughtsTokenCount ?? 0,
    image,
  };
}

/**
 * Records what one AI request used and cost, for the signed-in person's
 * usage list, and logs it on the server. Never fails the request.
 */
export async function recordUsage(
  step: string,
  model: string,
  usage: GeminiUsage | undefined,
) {
  if (!usage) return;
  const tokens = tokensOf(usage);
  const cost = costOf(model, tokens);
  console.info(
    `[ai usage] ${step} · ${model} · in ${tokens.input} · out ${tokens.output} · thinking ${tokens.thinking} · image ${tokens.image} · $${cost?.toFixed(4) ?? "?"}`,
  );
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("ai_usage").insert({
      step,
      model,
      input_tokens: tokens.input,
      output_tokens: tokens.output,
      thinking_tokens: tokens.thinking,
      image_tokens: tokens.image,
      cost_usd: cost,
    });
    if (error) console.error("[ai usage] Couldn’t record:", error.message);
  } catch (e) {
    console.error("[ai usage] Couldn’t record:", e);
  }
}
