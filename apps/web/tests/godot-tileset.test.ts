import { describe, expect, it } from "vitest";
import { godotTileSet } from "@/lib/tilemap/export";

describe("Godot TileSet", () => {
  it("lists every tile of the sheet as an atlas tile", () => {
    const text = godotTileSet({
      tile: { w: 16, h: 8 },
      count: 3,
      image: { file: "map-tileset.png", columns: 2 },
    });
    expect(text).toContain(
      '[gd_resource type="TileSet" load_steps=3 format=3]',
    );
    expect(text).toContain(
      '[ext_resource type="Texture2D" path="map-tileset.png" id="1_texture"]',
    );
    expect(text).toContain("texture_region_size = Vector2i(16, 8)");
    expect(text).toContain("tile_size = Vector2i(16, 8)");
    expect(text.match(/^\d+:\d+\/0 = 0$/gm)).toEqual([
      "0:0/0 = 0",
      "1:0/0 = 0",
      "0:1/0 = 0",
    ]);
  });
});
