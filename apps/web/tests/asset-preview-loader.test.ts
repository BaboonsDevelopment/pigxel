import { afterEach, expect, it, vi } from "vitest";
import { loadPreview } from "@/features/asset-review/preview-loader";

afterEach(() => vi.unstubAllGlobals());

it("loads the full queue in bounded batches and prioritizes a visible preview", async () => {
  const requests: FakeImage[] = [];
  class FakeImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    src = "";
    constructor() {
      requests.push(this);
    }
  }
  vi.stubGlobal("Image", FakeImage);

  const urls = Array.from({ length: 30 }, (_, i) => `/preview-${i}?v=test`);
  const results = urls.map((url) => loadPreview(url));
  expect(requests).toHaveLength(12);

  // A card far below the first batch becomes visible while the queue runs.
  expect(loadPreview(urls[29]!, true)).toBe(results[29]);
  requests[0]!.onload?.();
  expect(requests[12]!.src).toContain("/preview-29?");

  for (let i = 1; i < urls.length; i++) requests[i]!.onload?.();
  expect(requests).toHaveLength(urls.length);
  expect(await Promise.all(results)).toHaveLength(urls.length);
});
