import { screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { renderWithUser } from "@test/render";
vi.mock("@/features/membership/actions", () => ({
  giftBadge: vi.fn(),
  saveHiringProfile: vi.fn(),
  addPortfolioItem: vi.fn(),
  editPortfolioItem: vi.fn(),
}));
import {
  PerkActionButton,
  PortfolioItemForm,
} from "@/features/membership/components/perk-forms";

it("requires explicit confirmation and allows canceling badge removal", async () => {
  const action = vi.fn().mockResolvedValue({});
  const { user } = renderWithUser(
    <PerkActionButton
      action={action}
      destructive
      confirmMessage="Remove this gift permanently?"
    >
      Remove badge
    </PerkActionButton>,
  );
  await user.click(screen.getByRole("button", { name: "Remove badge" }));
  expect(action).not.toHaveBeenCalled();
  expect(screen.getByText("Remove this gift permanently?")).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Cancel" }));
  expect(
    screen.queryByRole("button", { name: "Confirm removal" }),
  ).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Remove badge" }));
  await user.click(screen.getByRole("button", { name: "Confirm removal" }));
  expect(action).toHaveBeenCalledTimes(1);
});

it("shows a recoverable error when a member action loses its connection", async () => {
  const { user } = renderWithUser(
    <PerkActionButton action={vi.fn().mockRejectedValue(new Error("offline"))}>
      Show on profile
    </PerkActionButton>,
  );
  await user.click(screen.getByRole("button", { name: "Show on profile" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Please try again",
  );
  expect(screen.getByRole("button", { name: "Show on profile" })).toBeEnabled();
});

it("opens existing portfolio details for editing and preserves an unavailable preview", () => {
  renderWithUser(
    <PortfolioItemForm
      arts={[]}
      item={{
        id: "project",
        title: "Game sprites",
        description: "A character set",
        url: "https://example.com/game",
        tile_id: "old-art",
        art: null,
      }}
    />,
  );
  expect(screen.getByRole("textbox", { name: "Project title" })).toHaveValue(
    "Game sprites",
  );
  expect(
    screen.getByRole("textbox", { name: "Description (optional)" }),
  ).toHaveValue("A character set");
  expect(screen.getByRole("combobox")).toHaveValue("old-art");
  expect(screen.getByRole("button", { name: "Save changes" })).toBeEnabled();
});
