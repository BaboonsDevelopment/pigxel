import { act, fireEvent, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { renderWithUser } from "@test/render";
import { navigation } from "@test/next";
vi.mock(
  "next/navigation",
  async () => (await import("@test/next")).navigationModule,
);
import {
  BackButton,
  NavigationHistory,
} from "@/components/navigation/back-button";
import { Breadcrumb } from "@/features/explore/components/art-page/components/breadcrumb";
const controls = () => (
  <>
    <NavigationHistory />
    <BackButton href="/assets" />
  </>
);
beforeEach(() => {
  window.history.replaceState(null, "", "/assets");
  navigation.pathname = "/assets";
});
it("uses the safe parent fallback for direct links even with older browser entries", async () => {
  window.history.pushState(null, "", "/assets/packs/crystal");
  navigation.pathname = "/assets/packs/crystal";
  const { user } = renderWithUser(controls());
  expect(screen.getByRole("link", { name: "Back" })).toHaveAttribute(
    "href",
    "/assets",
  );
  await user.click(screen.getByRole("link", { name: "Back" }));
  expect(navigation.router.back).not.toHaveBeenCalled();
  expect(navigation.router.replace).toHaveBeenCalledWith("/assets");
});
it("returns through browser history and keeps the source’s filters", async () => {
  const view = renderWithUser(controls());
  window.history.replaceState(
    null,
    "",
    "/assets?tab=packs&q=forest&access=free",
  );
  fireEvent.click(document.body);
  window.history.pushState(null, "", "/assets/packs/forest");
  navigation.pathname = "/assets/packs/forest";
  view.rerender(controls());
  expect(screen.getByRole("link", { name: "Back" })).toHaveAttribute(
    "href",
    "/assets?tab=packs&q=forest&access=free",
  );
  await view.user.click(screen.getByRole("link", { name: "Back" }));
  expect(navigation.router.back).toHaveBeenCalledOnce();
  expect(navigation.router.replace).not.toHaveBeenCalled();
});
it.each(["assets", "explore"])("returns to %s even when the previous page is elsewhere", async (section) => {
  const fixedControls = () => (
    <>
      <NavigationHistory />
      {section === "explore" ? <Breadcrumb /> : (
        <BackButton href="/assets" preferHistory={false}>Back to Assets</BackButton>
      )}
    </>
  );
  window.history.replaceState(null, "", "/u/artist");
  navigation.pathname = "/u/artist";
  const view = renderWithUser(fixedControls());
  fireEvent.click(document.body);
  const detail = section === "assets" ? "/assets/packs/forest" : "/art/forest";
  window.history.pushState(null, "", detail);
  navigation.pathname = detail;
  view.rerender(fixedControls());
  const back = screen.getByRole("link", { name: section === "assets" ? "Back to Assets" : "Back to Explore" });
  expect(back).toHaveAttribute("href", `/${section}`);
  await view.user.click(back);
  expect(navigation.router.replace).toHaveBeenCalledWith(`/${section}`);
  expect(navigation.router.back).not.toHaveBeenCalled();
});
it("returns to the source safely after a replace navigation", async () => {
  const view = renderWithUser(controls());
  fireEvent.click(document.body);
  window.history.replaceState(null, "", "/assets/packs/forest");
  navigation.pathname = "/assets/packs/forest";
  view.rerender(controls());
  await view.user.click(screen.getByRole("link", { name: "Back" }));
  expect(navigation.router.back).not.toHaveBeenCalled();
  expect(navigation.router.replace).toHaveBeenCalledWith("/assets");
});
it("does not assume the browser entry before a popstate belongs to Pigxel", async () => {
  const view = renderWithUser(controls());
  fireEvent.click(document.body);
  window.history.pushState(null, "", "/assets/packs/forest");
  navigation.pathname = "/assets/packs/forest";
  view.rerender(controls());
  await act(async () => {
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  await view.user.click(screen.getByRole("link", { name: "Back" }));
  expect(navigation.router.back).not.toHaveBeenCalled();
  expect(navigation.router.replace).toHaveBeenCalledWith("/assets");
});
it("closes modal details in place instead of navigating", async () => {
  const onBack = vi.fn();
  const { user } = renderWithUser(<BackButton onBack={onBack} />);
  await user.click(screen.getByRole("button", { name: "Back" }));
  expect(onBack).toHaveBeenCalledOnce();
  expect(navigation.router.back).not.toHaveBeenCalled();
});
it("rejects external and script fallback destinations", () => {
  const view = renderWithUser(<BackButton href="//example.com" />);
  expect(screen.getByRole("link", { name: "Back" })).toHaveAttribute(
    "href",
    "/home",
  );
  view.rerender(<BackButton href="javascript:alert(1)" />);
  expect(screen.getByRole("link", { name: "Back" })).toHaveAttribute(
    "href",
    "/home",
  );
});
