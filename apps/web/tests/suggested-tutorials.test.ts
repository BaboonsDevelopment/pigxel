import { describe, expect, it } from "vitest";
import { suggestedTutorials } from "@/features/tutorials/tutorials";

const free = ["a", "b", "c", "d"].map((slug) => ({ slug }));
const paid = ["p1", "p2"].map((slug) => ({ slug, premium: true }));
const all = [...free, ...paid];
const slugs = (list: ReturnType<typeof suggestedTutorials>) =>
  list.map(
    ({ tutorial, finished }) => `${tutorial.slug}${finished ? "✓" : ""}`,
  );

describe("suggested tutorials on Home", () => {
  it("shows three unfinished tutorials the person can open", () => {
    expect(
      slugs(suggestedTutorials(all, { premium: false, finished: new Set() })),
    ).toEqual(["a", "b", "c"]);
  });

  it("puts what's left first and fills up with finished ones", () => {
    const finished = new Set(["a", "b", "c"]);
    expect(
      slugs(suggestedTutorials(all, { premium: false, finished })),
    ).toEqual(["d", "a✓", "b✓"]);
  });

  it("never suggests premium tutorials without access", () => {
    const finished = new Set(["a", "b", "c", "d"]);
    expect(
      slugs(suggestedTutorials(all, { premium: false, finished })),
    ).toEqual(["a✓", "b✓", "c✓"]);
  });

  it("suggests premium tutorials with access", () => {
    const finished = new Set(["a", "b", "c", "d"]);
    expect(slugs(suggestedTutorials(all, { premium: true, finished }))).toEqual(
      ["p1", "p2", "a✓"],
    );
  });
});
