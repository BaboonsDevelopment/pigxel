import { expect, test as setup } from "@playwright/test";
import { AUTH_STATE, createAccount } from "./support/accounts";
import { logIn } from "./support/fixtures";

setup("sign in once for the signed-in tests", async ({ page }) => {
  const account = await createAccount("signed-in");
  await page.goto("/login");
  await logIn(page, account);
  await expect(page).toHaveURL(/\/home$/);
  await page.context().storageState({ path: AUTH_STATE });
});
