import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { PackCard } from "@/features/assets/components/pack-card";

const pack = {
  id: "vault",
  name: "Vault",
  description: null,
  count: 4,
  animated: 0,
  size: "64×64",
  background: null,
  premium: true,
  createdAt: "2026-10-19",
  pinnedAt: "2026-10-22",
  tags: [],
  uses: 0,
  longestSide: 64,
  previews: [],
};

const card = (premiumAccess: boolean, overrides = {}) =>
  render(
    <PackCard
      pack={{ ...pack, ...overrides }}
      tint=""
      favourite={false}
      onFavourite={() => {}}
      premiumAccess={premiumAccess}
    />,
  );

it("shows a glowing crown to people who can use premium", () => {
  card(true);
  expect(screen.getByRole("img", { name: "Premium" })).toBeInTheDocument();
  expect(screen.getByLabelText("Pinned")).toBeInTheDocument();
});

it("greys the crown out for people without a paid plan", () => {
  card(false);
  expect(
    screen.getByRole("img", { name: "Premium: needs a paid plan" }),
  ).toBeInTheDocument();
});

it("shows no crown or pin on a free, unpinned pack", () => {
  card(false, { premium: false, pinnedAt: null });
  expect(screen.queryByRole("img", { name: /Premium/ })).toBeNull();
  expect(screen.queryByLabelText("Pinned")).toBeNull();
});

it("counts animated and static assets, leaving out a kind it lacks", () => {
  const { unmount } = card(true, { count: 24, animated: 12 });
  expect(screen.getByText(/24 assets/)).toHaveTextContent("24 assets64×64");
  expect(screen.getByText("12 animated · 12 static")).toBeInTheDocument();
  unmount();
  card(true, { count: 20, animated: 0, size: null });
  expect(screen.getByText("20 assets")).toBeInTheDocument();
  expect(screen.getByText("20 static")).toBeInTheDocument();
  expect(screen.queryByText(/animated/)).toBeNull();
});
