import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithUser } from "@test/render";
import { GridSizeToggle, useGridSize } from "@/components/ui/grid-size-toggle";

function Picker({ storageKey = "pigxel.assets.grid" }) {
  const [value, onChange] = useGridSize(storageKey);
  return <GridSizeToggle value={value} onChange={onChange} />;
}

beforeEach(() => localStorage.clear());

describe("browsing card sizes", () => {
  it("remembers the selected size after leaving and returning", async () => {
    const view = renderWithUser(<Picker />);
    expect(screen.getByRole("radio", { name: "Medium cards" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await view.user.click(screen.getByRole("radio", { name: "Small cards" }));
    expect(localStorage.getItem("pigxel.assets.grid")).toBe("small");
    view.unmount();
    renderWithUser(<Picker />);
    expect(screen.getByRole("radio", { name: "Small cards" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("keeps Assets and Explore preferences separate and ignores invalid saved values", () => {
    localStorage.setItem("pigxel.explore.grid", "large");
    localStorage.setItem("pigxel.assets.grid", "invalid");
    renderWithUser(<Picker />);
    expect(screen.getByRole("radio", { name: "Medium cards" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(localStorage.getItem("pigxel.explore.grid")).toBe("large");
  });

  it("still switches sizes when browser storage is blocked", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Blocked");
    });
    const { user } = renderWithUser(<Picker />);
    await user.click(screen.getByRole("radio", { name: "Large cards" }));
    expect(screen.getByRole("radio", { name: "Large cards" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });
});
