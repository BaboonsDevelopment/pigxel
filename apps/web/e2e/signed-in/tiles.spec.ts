import { expect, test } from "../support/fixtures";

test("creates a tile in Pigxel cloud and opens it in the editor", async ({
  page,
}) => {
  const name = `Castle ${Date.now().toString(36)}`;
  await page.goto("/tiles/new");
  await page.getByLabel("Name").fill(name);
  await page.getByRole("button", { name: "16×16" }).click();
  await page.getByRole("button", { name: "Create tile" }).click();

  await expect(page).toHaveURL(/\/tiles\/edit\?id=[\w-]+$/);
  await expect(page.getByRole("textbox", { name: "File name" })).toHaveValue(
    name,
  );
  await expect(page.getByRole("status")).toHaveText(
    "All changes saved to Pigxel cloud",
  );
  await expect(
    page.getByRole("button", { name: "Pen (Draw tools)" }),
  ).toHaveAttribute("aria-pressed", "true");

  await page.goto("/home");
  await expect(
    page.getByRole("button", { name: `Open ${name}` }),
  ).toBeVisible();
});

test("keeps signed-in people away from the login page", async ({ page }) => {
  await page.goto("/login");
  await expect(page).toHaveURL("/home");
});
