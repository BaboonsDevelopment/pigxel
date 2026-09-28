import { beforeEach, describe, expect, it, vi } from "vitest";
import { blankImage } from "@/lib/pigxel-file/format";

/** A tiny stand-in for the Supabase browser client: a tiles table and a bucket. */
const fake = vi.hoisted(() => {
  const state = {
    rows: new Map<string, Record<string, unknown>>(),
    files: new Map<string, string>(),
    uploadFails: false,
    nextId: 1,
    lastUpload: null as unknown,
  };
  const client = {
    from: () => ({
      insert: (values: Record<string, unknown>) => ({
        select: () => ({
          single: async () => {
            const row = {
              id: `tile-${state.nextId++}`,
              user_id: "user-1",
              ...values,
            };
            state.rows.set(row.id, row);
            return { data: row, error: null };
          },
        }),
      }),
      update: (values: Record<string, unknown>) => ({
        eq: (_: string, id: string) => ({
          select: () => ({
            maybeSingle: async () => {
              const row = state.rows.get(id);
              if (row) Object.assign(row, values);
              return { data: row ?? null, error: null };
            },
          }),
        }),
      }),
      select: () => ({
        eq: (_: string, id: string) => ({
          maybeSingle: async () => ({
            data: state.rows.get(id) ?? null,
            error: null,
          }),
        }),
      }),
      delete: () => ({
        eq: async (_: string, id: string) => {
          state.rows.delete(id);
          return { error: null };
        },
      }),
    }),
    storage: {
      from: () => ({
        upload: async (path: string, body: Blob, options: object) => {
          if (state.uploadFails) return { error: { message: "nope" } };
          state.files.set(path, await body.text());
          state.lastUpload = { path, options };
          return { error: null };
        },
        download: async (path: string) => {
          const text = state.files.get(path);
          return text === undefined
            ? { data: null, error: { message: "missing" } }
            : { data: new Blob([text]), error: null };
        },
        remove: async (paths: string[]) => {
          paths.forEach((p) => state.files.delete(p));
          return { error: null };
        },
      }),
    },
  };
  return { state, client };
});

vi.mock("@/lib/supabase/client", () => ({ createClient: () => fake.client }));

import {
  deleteCloudTile,
  readCloudTile,
  saveCloudTile,
} from "@/lib/pigxel-file/cloud";

const image = blankImage(16, 8, "white");

beforeEach(() => {
  fake.state.rows.clear();
  fake.state.files.clear();
  fake.state.uploadFails = false;
  fake.state.nextId = 1;
});

describe("Pigxel cloud tiles", () => {
  it("creates the tile row, then its file under the owner's folder", async () => {
    const tile = await saveCloudTile(
      { name: "Grass.pigxel" },
      "{file}",
      image,
      "data:image/png;base64,x",
    );
    expect(tile).toEqual({ id: "tile-1", name: "Grass" });
    expect(fake.state.rows.get("tile-1")).toMatchObject({
      name: "Grass",
      width: 16,
      height: 8,
      background: "white",
      thumbnail: "data:image/png;base64,x",
    });
    expect(fake.state.files.get("user-1/tile-1.pigxel")).toBe("{file}");
    expect(fake.state.lastUpload).toMatchObject({
      options: { contentType: "application/vnd.pigxel+json", upsert: true },
    });
  });
  it("updates an existing tile in place", async () => {
    await saveCloudTile({ name: "Grass" }, "v1", image, "");
    const again = await saveCloudTile(
      { id: "tile-1", name: "Meadow" },
      "v2",
      image,
      "",
    );
    expect(again.id).toBe("tile-1");
    expect(fake.state.rows.size).toBe(1);
    expect(fake.state.rows.get("tile-1")?.name).toBe("Meadow");
    expect(fake.state.files.get("user-1/tile-1.pigxel")).toBe("v2");
  });
  it("doesn't leave an empty tile behind when the upload fails", async () => {
    fake.state.uploadFails = true;
    await expect(
      saveCloudTile({ name: "Grass" }, "v1", image, ""),
    ).rejects.toThrow("Couldn’t save to Pigxel cloud");
    expect(fake.state.rows.size).toBe(0);
  });
  it("reports a tile that was deleted elsewhere", async () => {
    await expect(
      saveCloudTile({ id: "gone", name: "Grass" }, "v1", image, ""),
    ).rejects.toThrow("no longer in Pigxel cloud");
  });
  it("drops thumbnails too large for the tile list", async () => {
    await saveCloudTile({ name: "Big" }, "v1", image, "x".repeat(60000));
    expect(fake.state.rows.get("tile-1")?.thumbnail).toBeNull();
  });
  it("reads and deletes a tile with its file", async () => {
    await saveCloudTile({ name: "Grass" }, "{pixels}", image, "");
    expect(await readCloudTile("tile-1")).toBe("{pixels}");
    await deleteCloudTile("tile-1");
    expect(fake.state.rows.size).toBe(0);
    expect(fake.state.files.size).toBe(0);
    await expect(readCloudTile("tile-1")).rejects.toThrow(
      "no longer in Pigxel cloud",
    );
  });
});
