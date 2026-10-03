import "server-only";
import { createClient } from "@/lib/supabase/server";

const CREDIT_LIMIT = 5000;
const CREDITS_PER_DOLLAR = 1000;

export const creditsOf = (usd: number) => usd * CREDITS_PER_DOLLAR;

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
