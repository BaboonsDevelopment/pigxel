import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GeneratedPicture } from "@/features/ai/components/chat-panel/components/generated-picture";
import { transparentPicturePreview } from "@/lib/image/picture-preview";

vi.mock("@/lib/image/picture-preview", () => ({
  transparentPicturePreview: vi.fn(),
}));
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("IntersectionObserver", undefined);
  vi.mocked(transparentPicturePreview).mockResolvedValue(
    "data:image/png;base64,transparent",
  );
});
afterEach(() => vi.unstubAllGlobals());

describe("AI picture previews", () => {
  it("shows a transparent display copy of a sprite instead of the source key background", async () => {
    render(<GeneratedPicture source="original-sprite" composition="sprite" />);
    expect(await screen.findByRole("img")).toHaveAttribute(
      "src",
      "data:image/png;base64,transparent",
    );
    expect(transparentPicturePreview).toHaveBeenCalledWith("original-sprite");
    expect(screen.getByRole("img").parentElement).toHaveClass("bg-checker");
  });
  it("keeps complete scene pictures and their backgrounds unchanged", () => {
    render(<GeneratedPicture source="magenta-scene" composition="scene" />);
    expect(screen.getByRole("img")).toHaveAttribute("src", "magenta-scene");
    expect(transparentPicturePreview).not.toHaveBeenCalled();
    expect(screen.getByRole("img").parentElement).not.toHaveClass("bg-checker");
  });
  it("keeps the source visible if preview preparation fails", async () => {
    vi.mocked(transparentPicturePreview).mockRejectedValue(
      new Error("decode failed"),
    );
    render(<GeneratedPicture source="original-sprite" composition="sprite" />);
    expect(await screen.findByRole("img")).toHaveAttribute(
      "src",
      "original-sprite",
    );
  });
  it("does not replace a new picture with the previous picture's late preview", async () => {
    let finish: ((preview: string) => void) | undefined;
    vi.mocked(transparentPicturePreview).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const view = render(
      <GeneratedPicture source="first-sprite" composition="sprite" />,
    );
    view.rerender(
      <GeneratedPicture source="second-sprite" composition="sprite" />,
    );
    expect(await screen.findByRole("img")).toHaveAttribute(
      "src",
      "data:image/png;base64,transparent",
    );
    finish?.("late-first-preview");
    await waitFor(() =>
      expect(screen.getByRole("img")).not.toHaveAttribute(
        "src",
        "late-first-preview",
      ),
    );
  });
});
