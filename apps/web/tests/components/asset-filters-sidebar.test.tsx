import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithUser } from "@test/render";
import { AssetFiltersSidebar } from "@/features/assets/components/asset-filters-menu";
import { NO_ASSET_FILTERS } from "@/features/assets/filters";

const TAGS = [
  { id: "undead", name: "Undead" },
  { id: "cute", name: "Cute" },
];

function sidebar(filters = NO_ASSET_FILTERS) {
  const onChange = vi.fn();
  const onClose = vi.fn();
  const view = renderWithUser(
    <AssetFiltersSidebar
      id="filters"
      filters={{ ...filters, query: "bat", sort: "popular" }}
      onChange={onChange}
      onClose={onClose}
      tags={TAGS}
      packs={[]}
    />,
  );
  return { ...view, onChange, onClose };
}

describe("the assets filters sidebar", () => {
  it("applies each change at once, keeping the search", async () => {
    const { user, onChange } = sidebar();
    await user.click(screen.getByRole("button", { name: "Undead" }));
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ tags: ["undead"], query: "bat" }),
    );
  });

  it("clears the filters but not the search or sort", async () => {
    const { user, onChange } = sidebar({
      ...NO_ASSET_FILTERS,
      tags: ["cute"],
      favourites: true,
    });
    await user.click(screen.getByRole("button", { name: "Clear all" }));
    expect(onChange).toHaveBeenLastCalledWith({
      ...NO_ASSET_FILTERS,
      query: "bat",
      sort: "popular",
    });
  });

  it("has nothing to clear with no filters on, and closes", async () => {
    const { user, onClose } = sidebar();
    expect(screen.getByRole("button", { name: "Clear all" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Close filters" }));
    expect(onClose).toHaveBeenCalled();
  });
});
