import { describe, expect, it } from "vitest";
import {
  mapComment,
  removeComment,
  type ArtComment,
} from "@/features/explore/comments";

const comment = (id: string, replies: ArtComment[] = []): ArtComment => ({
  id,
  body: id,
  createdAt: "2026-10-08T00:00:00Z",
  edited: false,
  parentId: null,
  replies,
  author: { id: "u", username: "u", name: "U", avatarUrl: null },
});

const tree = [comment("a", [comment("b", [comment("c")])]), comment("d")];

describe("comment tree", () => {
  it("updates a nested reply", () => {
    const next = mapComment(tree, "c", (c) => ({ ...c, body: "changed" }));
    expect(next[0]!.replies[0]!.replies[0]!.body).toBe("changed");
    expect(tree[0]!.replies[0]!.replies[0]!.body).toBe("c");
  });

  it("removes a reply with everything under it", () => {
    const next = removeComment(tree, "b");
    expect(next[0]!.replies).toEqual([]);
    expect(next).toHaveLength(2);
  });
});
