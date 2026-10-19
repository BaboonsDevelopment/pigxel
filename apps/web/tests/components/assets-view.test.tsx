import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { screen, within, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { renderWithUser } from "@test/render";
import { NO_ASSET_FILTERS } from "@/features/assets/filters";
vi.mock(
  "next/navigation",
  async () => (await import("@test/next")).navigationModule,
);
const mocks = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock("@/features/assets/actions", () => ({
  loadAssetPage: mocks.load,
  setAssetFavourite: vi.fn().mockResolvedValue({}),
  setPackFavourite: vi.fn().mockResolvedValue({}),
}));
import { AssetsView } from "@/features/assets/components/assets-view";
const pack = {
  id: "crystal-caverns",
  name: "Crystal Caverns Observatory Buildings",
  description: "Cave tiles",
  count: 20,
  animated: 5,
  size: "64×64",
  background: null,
  premium: false,
  createdAt: "2026-10-19",
  tags: ["fantasy"],
  uses: 0,
  longestSide: 64,
  previews: [],
};
const tags = [
  { id: "fantasy", name: "Fantasy" },
  { id: "forest", name: "Forest" },
];
function view(tab: "packs" | "all" = "packs") {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 60_000 } },
  });
  return renderWithUser(
    <QueryClientProvider client={client}>
      <AssetsView
        tab={tab}
        filters={NO_ASSET_FILTERS}
        packs={[pack]}
        tags={tags}
        favourites={{ assets: [], packs: [] }}
        recent={[]}
        firstPage={tab === "all" ? { assets: [], count: 0 } : null}
        openAsset={null}
      />
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, "", "/assets");
  mocks.load.mockResolvedValue({ assets: [], count: 0 });
});
it("keeps full names, visible sorting and readable density choices", async () => {
  const { user } = view();
  expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
    "All assets",
    "Packs",
    "Palettes",
  ]);
  expect(
    screen.getByRole("link", { name: /Crystal Caverns Observatory Buildings/ }),
  ).toHaveAttribute("href", "/assets/packs/crystal-caverns");
  expect(
    screen.getByRole("combobox", { name: "Search packs" }),
  ).toHaveAttribute("placeholder", "Search packs or #tags…");
  expect(screen.getByRole("radio", { name: "Comfortable" })).toBeChecked();
  await user.click(screen.getByRole("radio", { name: "Compact" }));
  expect(screen.getByRole("radio", { name: "Compact" })).toBeChecked();
  await user.keyboard("{ArrowLeft}");
  expect(screen.getByRole("radio", { name: "Comfortable" })).toBeChecked();
  await user.selectOptions(
    screen.getByRole("combobox", { name: "Sort by" }),
    "az",
  );
  expect(window.location.search).toContain("sort=az");
  expect(screen.getByRole("status")).toHaveTextContent("1 pack");
  await user.click(screen.getByRole("tab", { name: "Palettes" }));
  expect(
    screen.queryByRole("combobox", { name: "Search packs" }),
  ).not.toBeInTheDocument();
});
it("drafts filters in a modal and applies matching results only when confirmed", async () => {
  const { user } = view();
  await user.click(screen.getByRole("button", { name: "Filters" }));
  const drawer = screen.getByRole("dialog", { name: "Filters" });
  await user.selectOptions(
    within(drawer).getByRole("combobox", { name: "Access" }),
    "premium",
  );
  expect(
    within(drawer).getByRole("button", { name: "Show 0 packs" }),
  ).toBeEnabled();
  expect(
    screen.getByRole("link", { name: /Crystal Caverns/ }),
  ).toBeInTheDocument();
  expect(window.location.search).not.toContain("access=premium");
  await user.click(
    within(drawer).getByRole("button", { name: "Show 0 packs" }),
  );
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(window.location.search).toContain("access=premium");
  expect(screen.getByText("No packs match")).toBeInTheDocument();
  await user.click(
    screen.getByRole("button", { name: "Remove Premium filter" }),
  );
  expect(
    screen.getByRole("link", { name: /Crystal Caverns/ }),
  ).toBeInTheDocument();
});
it("discards draft filters with Escape", async () => {
  const { user } = view();
  await user.click(screen.getByRole("button", { name: "Filters" }));
  const drawer = screen.getByRole("dialog", { name: "Filters" });
  await user.click(within(drawer).getByRole("button", { name: "Fantasy" }));
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Remove #Fantasy filter" }),
  ).not.toBeInTheDocument();
  expect(window.location.search).not.toContain("tags=");
});
it("suggests tags for a lone hash, supports keyboard selection and removes tag chips", async () => {
  const { user } = view();
  const search = screen.getByRole("combobox", { name: "Search packs" });
  await user.type(search, "#");
  expect(
    screen.getByRole("listbox", { name: "Suggested tags" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: /Crystal Caverns/ }),
  ).toBeInTheDocument();
  expect(window.location.search).not.toContain("q=");
  await user.type(search, "fant");
  expect(screen.getByRole("option", { name: /Fantasy/ })).toBeInTheDocument();
  await user.keyboard("{Enter}");
  expect(search).toHaveValue("");
  expect(
    screen.getByRole("button", { name: "Remove #Fantasy filter" }),
  ).toBeInTheDocument();
  expect(window.location.search).toContain("tags=fantasy");
  await user.click(
    screen.getByRole("button", { name: "Remove #Fantasy filter" }),
  );
  expect(window.location.search).not.toContain("tags=");
});
it("shows server-verified matching asset counts in the drawer", async () => {
  mocks.load.mockResolvedValue({ assets: [], count: 12 });
  const { user } = view("all");
  await user.click(screen.getByRole("button", { name: "Filters" }));
  const drawer = screen.getByRole("dialog", { name: "Filters" });
  await waitFor(() =>
    expect(
      within(drawer).getByRole("button", { name: "Show 12 assets" }),
    ).toBeEnabled(),
  );
  expect(mocks.load).toHaveBeenCalledWith(NO_ASSET_FILTERS, 0);
});

it("lets people retry an asset query without reloading the page", async () => {
  mocks.load.mockRejectedValueOnce(new Error("temporarily offline"));
  const { user } = view("all");
  await user.type(
    screen.getByRole("combobox", { name: "Search assets" }),
    "crystal",
  );
  const retry = await screen.findByRole("button", { name: "Try again" });
  mocks.load.mockResolvedValue({ assets: [], count: 0 });
  await user.click(retry);
  expect(await screen.findByText("Nothing matches")).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Try again" }),
  ).not.toBeInTheDocument();
});

it("keeps Apply available when the matching-count request fails", async () => {
  mocks.load.mockRejectedValue(new Error("temporarily offline"));
  const { user } = view("all");
  await user.click(screen.getByRole("button", { name: "Filters" }));
  const drawer = screen.getByRole("dialog", { name: "Filters" });
  expect(
    await within(drawer).findByRole("button", { name: "Apply filters" }),
  ).toBeEnabled();
  expect(
    within(drawer).queryByRole("button", { name: "Show 0 assets" }),
  ).not.toBeInTheDocument();
});
