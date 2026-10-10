import { expect, test } from "../support/fixtures";

test("introduces Pigxel and invites people to sign up @mobile", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Pigxel Studio",
  );
  await page
    .getByRole("region", { name: /^Pigxel Studio/ })
    .getByRole("link", { name: "Start creating — it’s free" })
    .click();
  await expect(page).toHaveURL("/login?mode=signup");
  await expect(
    page.getByRole("heading", { name: "Create your free account" }),
  ).toBeVisible();
});

test("shows guests the community feed", async ({ page }) => {
  await page.goto("/explore");
  await expect(
    page.getByRole("heading", { name: "Explore", level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByRole("searchbox", { name: "Search arts, tags or artists" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Publish" })).toHaveAttribute(
    "href",
    "/login",
  );
});

for (const [path, title] of [
  ["/privacy", "Privacy Policy"],
  ["/terms", "Terms of Service"],
  ["/refunds", "Refund Policy"],
  ["/pricing", "Pricing"],
] as const) {
  test(`serves ${path} @mobile`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(`${title} · Pigxel`);
  });
}

test("answers unknown pages with the 404 page", async ({ page }) => {
  const response = await page.goto("/no-such-page");
  expect(response?.status()).toBe(404);
  await expect(page.getByText("This page wandered off")).toBeVisible();
});
