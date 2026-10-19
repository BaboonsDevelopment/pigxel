import { screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { renderWithUser } from "@test/render";
import { navigation } from "@test/next";
vi.mock(
  "next/navigation",
  async () => (await import("@test/next")).navigationModule,
);
vi.mock("@/features/assets/actions", () => ({ recordAssetUse: vi.fn() }));
import { AssetDialog } from "@/features/assets/components/asset-dialog";

it.each(["Back to Assets", "Close"])("handles the asset preview’s %s control", async (action) => {
  const close = vi.fn();
  const { user } = renderWithUser(
    <AssetDialog
      asset={{
        id: "crystal",
        name: "Crystal",
        packId: "caverns",
        kind: "sprite",
        width: 64,
        height: 64,
        frames: 1,
        frameMs: 100,
        colors: [],
        premium: false,
        fileUrl: null,
        sheetUrl: "/crystal.png",
        uses: 0,
        tags: [],
      }}
      pack={{ id: "caverns", name: "Crystal Caverns", premium: false }}
      tagNames={new Map()}
      favourite={false}
      onFavourite={vi.fn()}
      onPack={vi.fn()}
      onTag={vi.fn()}
      onClose={close}
    />,
  );
  const back = screen.getByRole("button", { name: "Back to Assets" });
  expect(back).toBeVisible();
  expect(screen.getByRole("button", { name: "Close" })).toBeVisible();
  await user.click(screen.getByRole("button", { name: action }));
  expect(close).toHaveBeenCalledOnce();
  expect(navigation.router.back).not.toHaveBeenCalled();
  if (action === "Back to Assets")
    expect(navigation.router.replace).toHaveBeenCalledWith("/assets");
  else expect(navigation.router.replace).not.toHaveBeenCalled();
});
