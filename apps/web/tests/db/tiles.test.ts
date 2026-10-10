import { describe, expect, it } from "vitest";
import { aTile, admin, guest, signUp } from "./helpers";

async function publicTile() {
  const owner = await signUp("owner");
  const { data: tile } = await owner.client
    .from("tiles")
    .insert(aTile())
    .select("id")
    .single()
    .throwOnError();
  // Only the server-side content check may publish; it uses the secret key.
  await admin
    .from("tiles")
    .update({ visibility: "public", review: "approved" })
    .eq("id", tile.id)
    .throwOnError();
  return { owner, tileId: tile.id as string };
}

describe("tiles", () => {
  it("are created private and owned by whoever creates them", async () => {
    const { user, client } = await signUp();
    const { data, error } = await client
      .from("tiles")
      .insert(aTile())
      .select("user_id, visibility, review")
      .single();
    expect(error).toBeNull();
    expect(data).toEqual({
      user_id: user.id,
      visibility: "private",
      review: null,
    });
  });

  it("can't be published without the content check", async () => {
    const { client } = await signUp();
    const insert = await client
      .from("tiles")
      .insert(aTile({ visibility: "public" }));
    expect(insert.error).toMatchObject({
      code: "42501",
      message: "Arts go public only after the content check",
    });

    const { data: tile } = await client
      .from("tiles")
      .insert(aTile())
      .select("id")
      .single();
    const update = await client
      .from("tiles")
      .update({ visibility: "public" })
      .eq("id", tile!.id);
    expect(update.error).toMatchObject({ code: "42501" });
  });

  it("can't be approved by their owner", async () => {
    const { client } = await signUp();
    const { data: tile } = await client
      .from("tiles")
      .insert(aTile())
      .select("id")
      .single();
    const approve = await client
      .from("tiles")
      .update({ review: "approved" })
      .eq("id", tile!.id);
    expect(approve.error).toMatchObject({
      code: "42501",
      message: "Only the content check can change a review",
    });
    const request = await client
      .from("tiles")
      .update({ review: "pending" })
      .eq("id", tile!.id);
    expect(request.error).toBeNull();
  });

  it("stay hidden from everyone else while private", async () => {
    const owner = await signUp("owner");
    const other = await signUp("other");
    const { data: tile } = await owner.client
      .from("tiles")
      .insert(aTile())
      .select("id")
      .single();
    for (const client of [other.client, guest()]) {
      const { data } = await client
        .from("tiles")
        .select("id")
        .eq("id", tile!.id);
      expect(data).toEqual([]);
    }
  });

  it("are visible to guests once published, until the profile goes private", async () => {
    const { owner, tileId } = await publicTile();
    const visible = await guest().from("tiles").select("id").eq("id", tileId);
    expect(visible.data).toEqual([{ id: tileId }]);

    await owner.client
      .from("profiles")
      .update({ visibility: "private" })
      .eq("id", owner.user.id)
      .throwOnError();
    const hidden = await guest().from("tiles").select("id").eq("id", tileId);
    expect(hidden.data).toEqual([]);
  });

  it("can't be changed or deleted by other people", async () => {
    const { tileId } = await publicTile();
    const { client } = await signUp("intruder");
    const update = await client
      .from("tiles")
      .update({ name: "Mine now" })
      .eq("id", tileId)
      .select("id");
    expect(update).toMatchObject({ error: null, data: [] });
    const remove = await client
      .from("tiles")
      .delete()
      .eq("id", tileId)
      .select("id");
    expect(remove).toMatchObject({ error: null, data: [] });

    const { data } = await admin
      .from("tiles")
      .select("name")
      .eq("id", tileId)
      .single();
    expect(data).toEqual({ name: "Test tile" });
  });
});
