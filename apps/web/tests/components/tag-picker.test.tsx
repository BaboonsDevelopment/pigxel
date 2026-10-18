import { screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { renderWithUser } from "@test/render";
import { MAX_ART_TAGS } from "@/features/explore/art-tags";
import { TagPicker } from "@/features/explore/components/explore-header/components/tag-picker";

function Picker({ initial = [] }: { initial?: string[] }) {
  const [tags, setTags] = useState(initial);
  return (
    <>
      <TagPicker value={tags} onChange={setTags} />
      <output>{tags.join(",")}</output>
    </>
  );
}

const chosen = () => screen.getByRole("status").textContent;

describe("picking an art's tags", () => {
  it("suggests tags as you type and adds one with Enter", async () => {
    const { user } = renderWithUser(<Picker />);
    await user.type(screen.getByRole("combobox"), "sci");
    expect(screen.getByRole("option", { name: "#sci-fi" })).toBeTruthy();
    await user.keyboard("{Enter}");
    expect(chosen()).toBe("sci-fi");
  });

  it("removes the last tag with Backspace in an empty field", async () => {
    const { user } = renderWithUser(<Picker initial={["house", "cute"]} />);
    await user.click(screen.getByRole("combobox"));
    await user.keyboard("{Backspace}");
    expect(chosen()).toBe("house");
  });

  it("says when a word isn't a tag", async () => {
    const { user } = renderWithUser(<Picker />);
    await user.type(screen.getByRole("combobox"), "zzqq");
    expect(screen.getByText(/No tag “zzqq”/)).toBeTruthy();
  });

  it(`stops at ${MAX_ART_TAGS} tags`, () => {
    const ten = [
      "house",
      "cute",
      "cat",
      "dog",
      "forest",
      "night",
      "retro",
      "magic",
      "food",
      "winter",
    ];
    renderWithUser(<Picker initial={ten} />);
    expect(screen.getByRole("combobox")).toHaveProperty("disabled", true);
    expect(screen.getByText("10/10")).toBeTruthy();
  });
});
