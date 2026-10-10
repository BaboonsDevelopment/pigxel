import { test as base, expect, type Page } from "@playwright/test";
import {
  createAccount,
  deleteAccounts,
  newEmail,
  type Account,
} from "./accounts";

type Fixtures = {
  /** A fresh, confirmed account, deleted after the test. */
  account: Account;
  /** An address nobody has signed up with; its account is deleted after the test. */
  newAddress: string;
  /** Fails the test if the page throws an uncaught error. */
  pageErrors: void;
  /** Blocks requests to anything but the app and local Supabase. */
  localOnly: void;
};

const isExternal = (url: URL) =>
  url.protocol.startsWith("http") &&
  !["localhost", "127.0.0.1"].includes(url.hostname);

export const test = base.extend<Fixtures>({
  account: async ({}, use, testInfo) => {
    const account = await createAccount(`t${testInfo.workerIndex}`);
    await use(account);
    await deleteAccounts((email) => email === account.email);
  },
  newAddress: async ({}, use) => {
    const email = newEmail("signup");
    await use(email);
    await deleteAccounts((address) => address === email);
  },
  pageErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on("pageerror", (error) =>
        errors.push(error.stack ?? error.message),
      );
      await use();
      expect(errors, "Uncaught errors in the page").toEqual([]);
    },
    { auto: true },
  ],
  localOnly: [
    async ({ context }, use) => {
      await context.route(isExternal, (route) =>
        route.abort("blockedbyclient"),
      );
      await use();
    },
    { auto: true },
  ],
});

export { expect };

export async function logIn(page: Page, { email, password }: Account) {
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
}
