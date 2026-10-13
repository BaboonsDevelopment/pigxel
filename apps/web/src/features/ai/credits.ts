import "server-only";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import { getCurrentPlan } from "@/features/billing/server";
import { aiAllowance } from "@/features/billing/pricing";

const CREDITS_PER_DOLLAR = 1000;

export const creditsOf = (usd: number) => usd * CREDITS_PER_DOLLAR;

/**
 * The signed-in person's AI tokens: paid plans get a monthly allowance that
 * resets on the 1st (UTC); Free has none.
 */
export async function creditBalance(): Promise<{
  limit: number;
  spent: number;
  left: number;
  resetsAt: string | null;
}> {
  const user = await requireUser();
  const plan = await getCurrentPlan(user.id);
  const { tokens, since, resetsAt } = aiAllowance(plan.name);
  if (tokens === 0) return { limit: 0, spent: 0, left: 0, resetsAt: null };
  const supabase = await createClient();
  const { data, error } = since
    ? await supabase.rpc("ai_spent_usd_since", { p_since: since })
    : await supabase.rpc("ai_spent_usd");
  if (error) throw new Error(`Couldn’t read the AI balance: ${error.message}`);
  const spent = creditsOf(Number(data ?? 0));
  return {
    limit: tokens,
    spent,
    left: Math.max(0, tokens - spent),
    resetsAt,
  };
}
