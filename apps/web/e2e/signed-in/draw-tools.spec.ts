import {
  BLACK,
  CLEAR,
  WHITE,
  openBlankTile,
  rowByRow,
  run,
} from "../support/editor";
import { expect, test } from "../support/fixtures";

test("the pen paints the pixel under the pointer", async ({ page }) => {
  const tile = await openBlankTile(page);
  await tile.click(2, 3);
  expect(await tile.painted()).toEqual(["2,3"]);
  expect(await tile.pixel(2, 3)).toEqual(BLACK);
});

test("pen strokes leave no gaps between far-apart pointer moves", async ({
  page,
}) => {
  const tile = await openBlankTile(page);
  await tile.drag([1, 10], [12, 10]);
  expect(await tile.painted()).toEqual(run([1, 10], [12, 10]));
});

test("the right button paints with the secondary colour", async ({ page }) => {
  const tile = await openBlankTile(page);
  await tile.click(4, 4, "right");
  expect(await tile.pixel(4, 4)).toEqual(WHITE);
});

test("the eraser clears only what it touches", async ({ page }) => {
  const tile = await openBlankTile(page);
  await tile.drag([1, 10], [6, 10]);
  await page.keyboard.press("e");
  await tile.click(3, 10);
  expect(await tile.pixel(3, 10)).toEqual(CLEAR);
  expect(await tile.painted()).toEqual(
    run([1, 10], [6, 10]).filter((pixel) => pixel !== "3,10"),
  );
});

test("the paint bucket fills only the enclosed area", async ({ page }) => {
  const tile = await openBlankTile(page);
  // A wall across the tile splits it in two.
  await tile.drag([0, 5], [15, 5]);
  await page.keyboard.press("g");
  await tile.click(3, 10);
  const painted = await tile.painted();
  expect(painted).toHaveLength(16 * 11);
  expect(painted).not.toContain("3,2");
  expect(await tile.pixel(15, 15)).toEqual(BLACK);
});

test("the line tool joins press and release", async ({ page }) => {
  const tile = await openBlankTile(page);
  await page.keyboard.press("l");
  await tile.drag([1, 1], [6, 6]);
  expect(await tile.painted()).toEqual(run([1, 1], [6, 6]));
});

test("the rectangle tool draws an outline", async ({ page }) => {
  const tile = await openBlankTile(page);
  await page.keyboard.press("u");
  await tile.drag([2, 2], [7, 5]);
  expect(await tile.painted()).toEqual(
    rowByRow([
      ...run([2, 2], [7, 2]),
      ...run([2, 5], [7, 5]),
      ...run([2, 2], [2, 5]),
      ...run([7, 2], [7, 5]),
    ]),
  );
});

test("the pipette picks the colour under the pointer", async ({ page }) => {
  const tile = await openBlankTile(page);
  await tile.click(2, 2, "right");
  await page.keyboard.press("i");
  await tile.click(2, 2);
  await expect(
    page.getByRole("button", { name: /^Primary colour .*: #ffffff$/ }),
  ).toBeVisible();
});

test("undo and redo step through strokes", async ({ page }) => {
  const tile = await openBlankTile(page);
  await tile.click(2, 2);
  await tile.click(4, 4);
  await page.keyboard.press("ControlOrMeta+z");
  expect(await tile.painted()).toEqual(["2,2"]);
  await page.keyboard.press("ControlOrMeta+z");
  expect(await tile.painted()).toEqual([]);
  await page.keyboard.press("ControlOrMeta+Shift+z");
  await page.keyboard.press("ControlOrMeta+Shift+z");
  expect(await tile.painted()).toEqual(["2,2", "4,4"]);
});

test("delete clears only the selected pixels", async ({ page }) => {
  const tile = await openBlankTile(page);
  await page.keyboard.press("g");
  await tile.click(8, 8);
  await page.keyboard.press("m");
  await tile.drag([2, 2], [5, 5]);
  await page.keyboard.press("Delete");
  const painted = await tile.painted();
  expect(painted).toHaveLength(16 * 16 - 4 * 4);
  expect(await tile.pixel(3, 3)).toEqual(CLEAR);
  expect(await tile.pixel(6, 6)).toEqual(BLACK);
});
