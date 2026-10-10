import { describe, expect, it } from "vitest";
import { aUser, supabase } from "@test/supabase";

const { client } = supabase;

describe("Supabase fake", () => {
  it("answers queries by table and records how they were chained", async () => {
    supabase.respond("tiles", { data: [{ id: "t1" }] });
    const result = await client
      .from("tiles")
      .select("id, name")
      .eq("owner", "u1")
      .order("created_at", { ascending: false })
      .limit(5);
    expect(result).toMatchObject({ data: [{ id: "t1" }], error: null });
    expect(supabase.callsTo("tiles")).toEqual([
      {
        kind: "query",
        table: "tiles",
        op: "select",
        columns: "id, name",
        options: undefined,
        filters: [
          ["eq", "owner", "u1"],
          ["order", "created_at", { ascending: false }],
          ["limit", 5],
        ],
      },
    ]);
  });

  it("prefers an answer for the operation over one for the table", async () => {
    supabase.respond("tiles", { data: [{ id: "any" }] });
    supabase.respond("tiles.insert", { error: { message: "denied" } });
    const insert = await client
      .from("tiles")
      .insert({ name: "x" })
      .select("id");
    expect(insert).toMatchObject({ data: null, error: { message: "denied" } });
    expect(supabase.callsTo("tiles.insert")[0]).toMatchObject({
      op: "insert",
      values: { name: "x" },
      columns: "id",
    });
    expect((await client.from("tiles").select()).data).toEqual([{ id: "any" }]);
  });

  it("uses one-off answers first, in order", async () => {
    supabase.respond("tiles", { data: [] });
    supabase.respondOnce("tiles", { data: [{ id: "first" }] });
    supabase.respondOnce("tiles", { data: [{ id: "second" }] });
    const ids = [];
    for (let i = 0; i < 3; i++)
      ids.push((await client.from("tiles").select()).data);
    expect(ids).toEqual([[{ id: "first" }], [{ id: "second" }], []]);
  });

  it("shapes single and maybeSingle like PostgREST", async () => {
    supabase.respond("profiles", { data: [{ id: "p1" }] });
    expect((await client.from("profiles").select().single()).data).toEqual({
      id: "p1",
    });

    supabase.respond("profiles", { data: [] });
    expect(
      (await client.from("profiles").select().maybeSingle()).data,
    ).toBeNull();
    expect(
      (await client.from("profiles").select().single()).error,
    ).toMatchObject({
      code: "PGRST116",
    });
  });

  it("counts rows and honours head requests", async () => {
    supabase.respond("tiles", { data: [{}, {}, {}] });
    const { data, count } = await client
      .from("tiles")
      .select("id", { count: "exact", head: true });
    expect({ data, count }).toEqual({ data: null, count: 3 });
  });

  it("computes answers from the call", async () => {
    supabase.respond("tiles", (call) => ({
      data: call.kind === "query" ? call.filters.map(([m]) => m) : null,
    }));
    expect(
      (await client.from("tiles").select().eq("id", "a").limit(1)).data,
    ).toEqual(["eq", "limit"]);
  });

  it("rejects when asked to throw on errors", async () => {
    supabase.respond("tiles", { error: { message: "boom" } });
    await expect(
      client.from("tiles").select().throwOnError(),
    ).rejects.toMatchObject({
      message: "boom",
    });
  });

  it("answers RPCs and storage, with defaults for uploads and public URLs", async () => {
    supabase.respond("rpc:search_public_tiles", { data: [{ id: "t1" }] });
    const found = await client.rpc("search_public_tiles", { q: "cat" });
    expect(found.data).toEqual([{ id: "t1" }]);
    expect(supabase.callsTo("rpc:search_public_tiles")[0]).toMatchObject({
      args: { q: "cat" },
    });

    const storage = client.storage.from("assets");
    expect(await storage.upload("a/b.png", new Blob())).toMatchObject({
      data: { path: "a/b.png" },
      error: null,
    });
    expect(storage.getPublicUrl("a/b.png").data.publicUrl).toMatch(
      /\/storage\/v1\/object\/public\/assets\/a\/b\.png$/,
    );
    supabase.respond("storage:assets.remove", { error: { message: "nope" } });
    expect((await storage.remove(["a/b.png"])).error).toEqual({
      message: "nope",
    });
    expect(
      supabase
        .callsTo("storage:assets")
        .map((c) => c.kind === "storage" && c.op),
    ).toEqual(["upload", "remove"]);
  });

  it("tracks who is signed in", async () => {
    expect((await client.auth.getUser()).data.user).toBeNull();
    const user = supabase.signIn(aUser({ email: "artist@pigxel.test" }));
    expect((await client.auth.getUser()).data.user).toBe(user);
    expect((await client.auth.getClaims()).data?.claims.sub).toBe(user.id);
    await client.auth.signOut();
    expect(supabase.user).toBeNull();
  });

  it("lets tests override auth answers and starts clean after a reset", async () => {
    supabase.auth.signUp.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: null,
    });
    expect(
      (
        await client.auth.signUp({
          email: "a@pigxel.test",
          password: "secret12",
        })
      ).data.session,
    ).toBeNull();
    supabase.respond("tiles", { data: [{ id: "t1" }] });
    supabase.reset();
    expect((await client.from("tiles").select()).data).toEqual([]);
    expect(supabase.callsTo("tiles")).toHaveLength(1);
    expect(
      (await client.auth.signUp({ email: "b@pigxel.test", password: "x" })).data
        .session,
    ).not.toBeNull();
  });
});
