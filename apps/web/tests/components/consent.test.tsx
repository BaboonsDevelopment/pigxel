import { act, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithUser } from "@test/render";

vi.mock("@/features/auth/actions", () => ({ authenticate: vi.fn() }));

import { CookieBanner } from "@/features/legal/components/cookie-banner";
import { SignupChoices } from "@/features/auth/components/signup-choices";
import { VideoEmbed } from "@/features/tutorials/components/video-embed";
import { LEGAL_VERSION } from "@/features/legal/legal";

const video = (
  <VideoEmbed
    src="https://www.youtube-nocookie.com/embed/x"
    title="Basics video"
  />
);

beforeEach(() => window.localStorage.clear());

describe("embedded videos", () => {
  it("load nothing from YouTube until people choose to", async () => {
    const { user, container } = renderWithUser(video);
    expect(container.querySelector("iframe")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Play Basics video" }));
    expect(container.querySelector("iframe")).not.toBeNull();
  });

  it("load straight away once videos are allowed", async () => {
    const { user } = renderWithUser(<CookieBanner />);
    await user.click(screen.getByRole("button", { name: "Allow videos" }));
    expect(screen.queryByRole("region", { name: "Cookie choices" })).toBeNull();
    const { container } = renderWithUser(video);
    expect(container.querySelector("iframe")).not.toBeNull();
  });

  it("stay off after choosing only necessary cookies", async () => {
    const { user } = renderWithUser(<CookieBanner />);
    await user.click(screen.getByRole("button", { name: "Only necessary" }));
    const { container } = renderWithUser(video);
    expect(container.querySelector("iframe")).toBeNull();
    act(() => window.dispatchEvent(new Event("pigxel:consent-open")));
    expect(screen.getByRole("region", { name: "Cookie choices" })).toBeTruthy();
  });
});

describe("sign-up consent", () => {
  it("keeps every way to sign up closed until both boxes are ticked", async () => {
    const { user } = renderWithUser(
      <SignupChoices
        googleHref="/auth/google?next=%2Fhome"
        appleHref="/auth/apple?next=%2Fhome"
        configured
        next="/home"
      />,
    );
    const create = screen.getByRole("button", { name: "Create account" });
    expect(create).toHaveProperty("disabled", true);
    expect(
      screen.queryByRole("link", { name: "Continue with Google" }),
    ).toBeNull();

    await user.click(screen.getByLabelText(/at least 16/));
    expect(create).toHaveProperty("disabled", true);
    await user.click(screen.getByLabelText(/I agree to the/));

    expect(create).toHaveProperty("disabled", false);
    expect(
      screen
        .getByRole("link", { name: "Continue with Google" })
        .getAttribute("href"),
    ).toBe(`/auth/google?next=%2Fhome&accept=${LEGAL_VERSION}`);
  });
});
