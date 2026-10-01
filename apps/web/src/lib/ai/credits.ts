import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * AI usage is paid for in credits, shown to people as "tokens": everyone has
 * a fixed allowance for now, and each request takes what it cost from it,
 * 10 credits a cent.
 */
export const CREDIT_LIMIT = 5000;
export const CREDITS_PER_DOLLAR = 1000;

/** Dollars as credits, unrounded. */
export const creditsOf = (usd: number) => usd * CREDITS_PER_DOLLAR;

/** The signed-in person's allowance and what is left of it, in credits. */
export async function creditBalance(): Promise<{
  limit: number;
  spent: number;
  left: number;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("ai_spent_usd");
  if (error) throw new Error(`Couldn’t read the AI balance: ${error.message}`);
  const spent = creditsOf(Number(data ?? 0));
  return {
    limit: CREDIT_LIMIT,
    spent,
    left: Math.max(0, CREDIT_LIMIT - spent),
  };
}
