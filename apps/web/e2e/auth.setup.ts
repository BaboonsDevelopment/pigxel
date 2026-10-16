import { expect, test as setup } from "@playwright/test";
import { AUTH_STATE, createAccount } from "./support/accounts";
import { logIn } from "./support/fixtures";

setup("sign in once for the signed-in tests", async ({ page }) => {
  // Every drawing test creates a tile in Pigxel cloud; Free keeps only 5.
  const account = await createAccount("signed-in", { plan: "advanced" });
  await page.goto("/login");
  await logIn(page, account);
  await expect(page).toHaveURL(/\/home$/);
  await page.context().storageState({ path: AUTH_STATE });
});
