import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
vi.mock(
  "next/navigation",
  async () => (await import("@test/next")).navigationModule,
);
const mocks = vi.hoisted(() => ({
  videos: vi.fn(),
  premium: vi.fn(),
  admin: vi.fn(),
}));
vi.mock("@/lib/auth/session", () => ({
  requireUser: async () => ({ id: "artist" }),
  isAdmin: mocks.admin,
}));
vi.mock("@/features/tutorials/server", () => ({
  listTutorialVideos: mocks.videos,
}));
vi.mock("@/features/tutorials/components/start-guide-button", () => ({
  StartGuideButton: () => <button>Start guide</button>,
}));
vi.mock("@/features/tutorials/components/tutorial-video-form", () => ({
  TutorialVideoForm: () => <div>Admin video controls</div>,
}));
vi.mock("@/features/tutorials/components/video-embed", () => ({
  VideoEmbed: ({ title }: { title: string }) => <div data-player>{title}</div>,
}));
vi.mock("@/features/assets/server", () => ({ findAsset: async () => null }));
vi.mock("@/features/billing/server", () => ({
  hasPremiumAccess: mocks.premium,
}));
import TutorialsPage from "@/app/(app)/tutorials/page";
import TutorialPage from "@/app/(app)/tutorials/[slug]/page";
import { TutorialVideo } from "@/features/tutorials/components/tutorial-video";
import { TUTORIALS } from "@/features/tutorials/tutorials";

const lesson = () =>
  TutorialPage({ params: Promise.resolve({ slug: "pixel-art-basics" }) });
describe("optional tutorial videos", () => {
  it("keeps lessons and practice available without rendering any video placeholder", async () => {
    mocks.videos.mockResolvedValue(new Map());
    mocks.admin.mockReturnValue(false);
    const list = renderToStaticMarkup(await TutorialsPage());
    const detail = renderToStaticMarkup(await lesson());
    expect(list).not.toContain("Video soon");
    expect(list).not.toContain("▶ Video");
    expect(detail).toContain("Start guide");
    expect(detail).toContain("Interactive guide");
    expect(detail).not.toContain("aspect-video");
    expect(detail).not.toContain("video");
    expect(
      renderToStaticMarkup(<TutorialVideo tutorial={TUTORIALS[0]!} />),
    ).toBe("");
  });
  it("shows the video only on the lesson with an attached recording", async () => {
    mocks.videos.mockResolvedValue(
      new Map([["pixel-art-basics", "dQw4w9WgXcQ"]]),
    );
    const list = renderToStaticMarkup(await TutorialsPage());
    expect(list.match(/▶ Video/g)).toHaveLength(1);
    const detail = renderToStaticMarkup(await lesson());
    expect(detail).toContain("data-player");
    expect(detail).toContain("Start guide");
  });
});

it("gates a premium recording without rendering a player or starting practice", async () => {
  const tutorial = TUTORIALS.find((lesson) => lesson.premium)!;
  mocks.videos.mockResolvedValue(new Map([[tutorial.slug, "dQw4w9WgXcQ"]]));
  mocks.premium.mockResolvedValue(false);
  const detail = renderToStaticMarkup(
    await TutorialPage({ params: Promise.resolve({ slug: tutorial.slug }) }),
  );
  expect(detail).toContain("Upgrade to watch this lesson");
  expect(detail).not.toContain("data-player");
  expect(detail).not.toContain("Start guide");
});
