import { PASSWORD } from "../support/accounts";
import { expect, logIn, test } from "../support/fixtures";

test("sends guests from private pages to log in", async ({ page }) => {
  for (const path of ["/home", "/tiles/new", "/settings/account"]) {
    await page.goto(path);
    await expect(page).toHaveURL("/login");
  }
});

test("signs up, signs out and logs back in @mobile", async ({
  page,
  newAddress,
}) => {
  await page.goto("/login?mode=signup");
  await page.getByLabel("Email").fill(newAddress);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL("/home");
  await expect(
    page.getByRole("heading", { name: "Start creating" }),
  ).toBeVisible();

  await page.goto("/settings/account");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL("/");

  await page.goto("/login");
  await logIn(page, { email: newAddress, password: PASSWORD });
  await expect(page).toHaveURL("/home");
});

test("keeps people on the form when the password is wrong", async ({
  page,
  account,
}) => {
  await page.goto("/login");
  await logIn(page, { ...account, password: "not-the-password" });
  await expect(
    page.getByText("Unable to log in. Check your email and password"),
  ).toBeVisible();
  await expect(page).toHaveURL("/login");
  await expect(page.getByLabel("Email")).toHaveValue(account.email);
});

test("returns to the page people were going to after logging in", async ({
  page,
  account,
}) => {
  await page.goto("/login?next=/tiles/new");
  await logIn(page, account);
  await expect(page).toHaveURL("/tiles/new");
  await expect(page.getByRole("heading", { name: "New tile" })).toBeVisible();
});
