import { showSnackbar } from "@/components/ui/snackbar";
import { getAiBalance } from "./actions";
import { showNoTokens } from "./components/no-tokens-dialog";
import { LOW_TOKENS_SHARE } from "./constants";

export async function warnAboutTokens(openPlans: () => void) {
  const balance = await getAiBalance().catch(() => null);
  if (!balance) return;
  if (balance.left <= 0) showNoTokens(balance.left, openPlans);
  else if (balance.left <= balance.limit * LOW_TOKENS_SHARE)
    showSnackbar("You’re running out of AI tokens.", {
      tone: "tokens",
      action: { label: "Upgrade", onClick: openPlans },
    });
}
