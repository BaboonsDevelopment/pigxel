import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { createClient } from "@/lib/supabase/server";
import { costOf, type Tokens } from "./pricing";

export type GeminiUsage = {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  thoughtsTokenCount?: number;
  candidatesTokensDetails?: { modality?: string; tokenCount?: number }[];
};

type UsageRecord = {
  step: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  thinking_tokens: number;
  image_tokens: number;
  cost_usd: number | null;
};
const pendingUsage = new AsyncLocalStorage<UsageRecord[]>();

/** A generated animation is billable only after extraction and review succeed. */
export async function billOnSuccess<T>(run: () => Promise<T>): Promise<T> {
  if (pendingUsage.getStore()) return run();
  const rows: UsageRecord[] = [];
  const result = await pendingUsage.run(rows, run);
  // A thrown error discards this request's rows; concurrent requests have their own store.
  if (rows.length) await saveUsage(rows);
  return result;
}

async function saveUsage(rows: UsageRecord[]) {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("ai_usage")
      .insert(rows.length === 1 ? rows[0]! : rows);
    if (error) console.error("[ai usage] Couldn’t record:", error.message);
  } catch (e) {
    console.error("[ai usage] Couldn’t record:", e);
  }
}

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
  const row: UsageRecord = {
    step,
    model,
    input_tokens: tokens.input,
    output_tokens: tokens.output,
    thinking_tokens: tokens.thinking,
    image_tokens: tokens.image,
    cost_usd: cost,
  };
  const pending = pendingUsage.getStore();
  if (pending) pending.push(row);
  else await saveUsage([row]);
}
