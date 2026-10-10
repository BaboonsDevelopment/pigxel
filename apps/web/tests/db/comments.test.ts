import { describe, expect, it } from "vitest";
import { aTile, admin, signUp } from "./helpers";

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
});
