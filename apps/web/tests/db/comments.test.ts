import { describe, expect, it } from "vitest";
import { aTile, admin, guest, signUp } from "./helpers";

async function tile(visibility: "private" | "public") {
  const owner = await signUp("owner");
  const { data } = await owner.client
    .from("tiles")
    .insert(aTile())
    .select("id")
    .single()
    .throwOnError();
  if (visibility === "public")
    await admin
      .from("tiles")
      .update({ visibility: "public", review: "approved" })
      .eq("id", data.id)
      .throwOnError();
  return data.id as string;
}

describe("comments", () => {
  it("can only be left on published arts", async () => {
    const { client } = await signUp("commenter");
    const onPrivate = await client
      .from("tile_comments")
      .insert({ tile_id: await tile("private"), body: "Nice!" });
    expect(onPrivate.error).toMatchObject({ code: "42501" });

    const onPublic = await client
      .from("tile_comments")
      .insert({ tile_id: await tile("public"), body: "Nice!" });
    expect(onPublic.error).toBeNull();
  });

  it("can only be edited and deleted by their author", async () => {
    const tileId = await tile("public");
    const author = await signUp("author");
    const other = await signUp("other");
    const { data: comment } = await author.client
      .from("tile_comments")
      .insert({ tile_id: tileId, body: "First!" })
      .select("id")
      .single()
      .throwOnError();

    const edit = await other.client
      .from("tile_comments")
      .update({ body: "Edited by someone else" })
      .eq("id", comment.id)
      .select("id");
    expect(edit).toMatchObject({ error: null, data: [] });
    const remove = await other.client
      .from("tile_comments")
      .delete()
      .eq("id", comment.id)
      .select("id");
    expect(remove).toMatchObject({ error: null, data: [] });

    const own = await author.client
      .from("tile_comments")
      .delete()
      .eq("id", comment.id)
      .select("id");
    expect(own.data).toEqual([{ id: comment.id }]);
  });

  it("can be reported once by others, but not by their author", async () => {
    const tileId = await tile("public");
    const author = await signUp("author");
    const reader = await signUp("reader");
    const { data: comment } = await author.client
      .from("tile_comments")
      .insert({ tile_id: tileId, body: "Hello" })
      .select("id")
      .single()
      .throwOnError();
    const report = (client: typeof author.client) =>
      client.from("comment_reports").insert({ comment_id: comment.id });

    expect((await report(author.client)).error).toMatchObject({
      code: "42501",
    });
    expect((await report(reader.client)).error).toBeNull();
    expect((await report(reader.client)).error).toMatchObject({
      code: "23505",
    });
  });

  it("are reported in the reporter's own name only", async () => {
    const tileId = await tile("public");
    const author = await signUp("author");
    const reader = await signUp("reader");
    const { data: comment } = await author.client
      .from("tile_comments")
      .insert({ tile_id: tileId, body: "Hello" })
      .select("id")
      .single()
      .throwOnError();
    const forged = await reader.client
      .from("comment_reports")
      .insert({ comment_id: comment.id, reporter_id: author.user.id });
    expect(forged.error).toMatchObject({
      code: "42501",
      message: "permission denied for table comment_reports",
    });
  });

  it("can be liked once per person, keeping a count only the database moves", async () => {
    const tileId = await tile("public");
    const author = await signUp("author");
    const fan = await signUp("fan");
    const { data: comment } = await author.client
      .from("tile_comments")
      .insert({ tile_id: tileId, body: "Hello" })
      .select("id")
      .single()
      .throwOnError();
    const count = async () =>
      (
        await admin
          .from("tile_comments")
          .select("like_count")
          .eq("id", comment.id)
          .single()
          .throwOnError()
      ).data.like_count;

    await fan.client
      .from("comment_likes")
      .insert({ comment_id: comment.id })
      .throwOnError();
    const twice = await fan.client
      .from("comment_likes")
      .insert({ comment_id: comment.id });
    expect(twice.error).toMatchObject({ code: "23505" });
    expect(await count()).toBe(1);

    const forged = await fan.client
      .from("tile_comments")
      .update({ like_count: 99 })
      .eq("id", comment.id);
    expect(forged.error).toMatchObject({ code: "42501" });

    const seen = await author.client
      .from("comment_likes")
      .select("user_id")
      .eq("comment_id", comment.id);
    expect(seen).toMatchObject({ error: null, data: [] });
    const anon = await guest()
      .from("comment_likes")
      .select("user_id")
      .eq("comment_id", comment.id);
    expect(anon).toMatchObject({ error: null, data: [] });

    await fan.client
      .from("comment_likes")
      .delete()
      .eq("comment_id", comment.id)
      .throwOnError();
    expect(await count()).toBe(0);
  });
});
