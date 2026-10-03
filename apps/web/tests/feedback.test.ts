import { describe, expect, it } from "vitest";
import {
  DESCRIPTION_MAX,
  TITLE_MAX,
  kindOf,
  pageFrom,
  readFeedback,
  titlePattern,
} from "@/features/feedback/feedback";

const report = {
  kind: "bug",
  title: "The bucket fills the whole tile",
  description: "Clicking inside the outline fills everything.",
};

describe("reading a report", () => {
  it("takes a complete report, tidying its text", () => {
    expect(
      readFeedback({
        ...report,
        title: "  The bucket   fills\tthe whole tile ",
        description: "Line one\r\nLine two\n",
      }),
    ).toEqual({
      value: {
        kind: "bug",
        title: "The bucket fills the whole tile",
        description: "Line one\nLine two",
      },
    });
  });

  it("keeps titles to 100 characters and descriptions to 300", () => {
    expect(TITLE_MAX).toBe(100);
    expect(DESCRIPTION_MAX).toBe(300);
    expect(
      readFeedback({ ...report, title: "x".repeat(TITLE_MAX) }),
    ).toHaveProperty("value");
    expect(
      readFeedback({ ...report, title: "x".repeat(TITLE_MAX + 1) }),
    ).toMatchObject({ field: "title" });
    expect(
      readFeedback({ ...report, description: "x".repeat(DESCRIPTION_MAX) }),
    ).toHaveProperty("value");
    expect(
      readFeedback({ ...report, description: "x".repeat(DESCRIPTION_MAX + 1) }),
    ).toMatchObject({ field: "description" });
  });

  it("names the field that's wrong", () => {
    expect(readFeedback({ ...report, kind: "praise" })).toMatchObject({
      field: "kind",
    });
    expect(readFeedback({ ...report, title: "   " })).toMatchObject({
      field: "title",
    });
  });

  it("asks for what's missing in the words of each kind", () => {
    expect(readFeedback({ ...report, description: " " })).toMatchObject({
      error: "Tell us what happened.",
    });
    expect(
      readFeedback({ ...report, kind: "feature", description: "" }),
    ).toMatchObject({ error: "Tell us what you’d like to do." });
  });
});

describe("kinds", () => {
  it("takes only bug and feature, never inherited names", () => {
    expect(kindOf("bug")).toBe("bug");
    expect(kindOf("feature")).toBe("feature");
    expect(kindOf("constructor")).toBe("feature");
    expect(kindOf(undefined, "bug")).toBe("bug");
    expect(readFeedback({ ...report, kind: "toString" })).toMatchObject({
      field: "kind",
    });
  });
});

describe("searching titles", () => {
  it("matches the text literally, anywhere in the title", () => {
    expect(titlePattern("  gif export ")).toBe("%gif export%");
    expect(titlePattern("100%_done\\")).toBe("%100\\%\\_done\\\\%");
    expect(titlePattern("   ")).toBeNull();
  });
});

describe("the page a report came from", () => {
  it("keeps paths on this site only", () => {
    expect(pageFrom("/tiles/edit?id=abc")).toBe("/tiles/edit?id=abc");
    expect(pageFrom("https://evil.example/")).toBeNull();
    expect(pageFrom("//evil.example/")).toBeNull();
    expect(pageFrom(undefined)).toBeNull();
    expect(pageFrom(`/${"a".repeat(400)}`)).toHaveLength(300);
  });
});
