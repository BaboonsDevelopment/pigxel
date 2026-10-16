import { expect, type Locator, type Page } from "@playwright/test";

/** Width and height of the tiles these helpers open. */
const SIZE = 16;

type Rgba = [number, number, number, number];

export const BLACK: Rgba = [0, 0, 0, 255];
export const WHITE: Rgba = [255, 255, 255, 255];
export const CLEAR: Rgba = [0, 0, 0, 0];

/**
 * The editor's canvas, addressed in sprite pixels. It is drawn at the
 * sprite's own size and scaled up, so reading it gives exact pixels.
 *
 * Its bottom and right edges carry the canvas resize handles: pointer
 * actions on the outermost pixels there grab a handle instead of drawing.
 */
class TileCanvas {
  constructor(
    readonly page: Page,
    readonly canvas: Locator,
  ) {}

  private async at(x: number, y: number) {
    const box = await this.canvas.boundingBox();
    if (!box) throw new Error("The tile canvas isn't on screen.");
    return {
      x: box.x + ((x + 0.5) * box.width) / SIZE,
      y: box.y + ((y + 0.5) * box.height) / SIZE,
    };
  }

  async click(x: number, y: number, button: "left" | "right" = "left") {
    const point = await this.at(x, y);
    await this.page.mouse.click(point.x, point.y, { button });
  }

  /** Presses at one pixel and releases at another, with few pointer moves between. */
  async drag(from: [number, number], to: [number, number]) {
    const start = await this.at(...from);
    const end = await this.at(...to);
    await this.page.mouse.move(start.x, start.y);
    await this.page.mouse.down();
    await this.page.mouse.move(end.x, end.y, { steps: 3 });
    await this.page.mouse.up();
  }

  async pixel(x: number, y: number): Promise<Rgba> {
    return this.canvas.evaluate(
      (canvas: HTMLCanvasElement, [x, y]) =>
        Array.from(
          canvas.getContext("2d")!.getImageData(x!, y!, 1, 1).data,
        ) as Rgba,
      [x, y],
    );
  }

  /** Every pixel that isn't fully transparent, as "x,y", row by row. */
  async painted(): Promise<string[]> {
    const data = await this.canvas.evaluate((canvas: HTMLCanvasElement) =>
      Array.from(
        canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height)
          .data,
      ),
    );
    const painted: string[] = [];
    for (let i = 0; i < SIZE * SIZE; i++)
      if (data[i * 4 + 3]) painted.push(`${i % SIZE},${Math.floor(i / SIZE)}`);
    return painted;
  }
}

/** Pixels from one point to another along a row, column or diagonal, as "x,y". */
export function run(from: [number, number], to: [number, number]) {
  const steps = Math.max(Math.abs(to[0] - from[0]), Math.abs(to[1] - from[1]));
  const dx = Math.sign(to[0] - from[0]);
  const dy = Math.sign(to[1] - from[1]);
  return Array.from(
    { length: steps + 1 },
    (_, i) => `${from[0] + i * dx},${from[1] + i * dy}`,
  );
}

/** Sorts "x,y" pixels row by row, the order `painted()` lists them in. */
export function rowByRow(pixels: string[]) {
  const key = (pixel: string) => {
    const [x, y] = pixel.split(",").map(Number);
    return y! * SIZE + x!;
  };
  return [...new Set(pixels)].sort((a, b) => key(a) - key(b));
}

/** Opens a new, transparent 16×16 tile in Pigxel cloud. */
export async function openBlankTile(page: Page) {
  await page.goto("/tiles/new");
  await page.getByLabel("Name").fill("Tool test");
  await page.getByRole("button", { name: `${SIZE}×${SIZE}` }).click();
  await page.getByRole("button", { name: "Create tile" }).click();
  await expect(page).toHaveURL(/\/tiles\/edit/);
  const canvas = page.getByLabel("Tile canvas");
  await expect(canvas).toBeVisible();
  return new TileCanvas(page, canvas);
}
