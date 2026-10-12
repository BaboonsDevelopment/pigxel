import { describe, expect, it } from "vitest";
import { SHARE_SIZE, shareImage } from "@/features/explore/share-image";
import { blankDocument } from "@/lib/pigxel-file/format";

describe("shareImage", () => {
  it("makes a 1200×630 PNG for link previews", () => {
    const png = Buffer.from(shareImage(blankDocument(16, 16, "white")));
    expect(png.subarray(1, 4).toString()).toBe("PNG");
    expect(png.readUInt32BE(16)).toBe(SHARE_SIZE.width);
    expect(png.readUInt32BE(20)).toBe(SHARE_SIZE.height);
  });
});
