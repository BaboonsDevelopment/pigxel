import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChatPanel } from "@/features/ai/components/chat-panel/chat-panel";
import type { CanvasBridge } from "@/features/ai/components/chat-panel/constants";
import { sendMessage } from "@/features/ai/actions";
import { loadChat } from "@/features/ai/chat/history";
import { generate } from "@/features/ai/components/chat-panel/flows/generate";
import { MAX_HISTORY } from "@/features/ai/constants";

vi.mock("next/navigation", () => {
  const router = { push: vi.fn() };
  return { useRouter: () => router };
});
vi.mock("@/features/ai/actions", () => ({ sendMessage: vi.fn() }));
vi.mock("@/features/ai/chat/history", () => ({
  loadChat: vi.fn(),
  saveChat: vi.fn(async () => true),
}));
vi.mock("@/features/ai/chat/pictures", () => ({
  findPicture: vi.fn(async () => null),
  keepPicture: vi.fn(async () => null),
  forgetPictures: vi.fn(),
}));
vi.mock("@/features/ai/components/chat-panel/flows/generate", () => ({
  generate: vi.fn(),
  drawOnNewLayer: vi.fn(),
}));
vi.mock("@/features/ai/components/chat-panel/flows/edit", () => ({
  edit: vi.fn(),
}));
vi.mock("@/features/ai/components/chat-panel/flows/animate", () => ({
  animate: vi.fn(),
}));
vi.mock("@/features/ai/token-warnings", () => ({
  warnAboutTokens: vi.fn(),
}));
vi.mock("@/components/ui/snackbar", () => ({
  showLoading: vi.fn(() => ({ close: vi.fn() })),
}));

const canvas = { highlight: vi.fn() } as unknown as CanvasBridge;
const prompt = "draw a blood mage";
const send = async () => {
  const input = screen.getByRole("textbox", { name: "Message" });
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled(),
  );
  fireEvent.change(input, { target: { value: prompt } });
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Send" })).toBeEnabled(),
  );
  fireEvent.click(screen.getByRole("button", { name: "Send" }));
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(loadChat).mockResolvedValue({ messages: [] });
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("AI chat submission", () => {
  it("shows a failed first request even after restoring its prompt to the input", async () => {
    vi.mocked(sendMessage).mockResolvedValue({
      ok: false,
      error: "The AI is unavailable.",
    });
    render(<ChatPanel tileId="tile" canvas={canvas} />);
    await send();
    expect(await screen.findByText("The AI is unavailable.")).toBeVisible();
    expect(screen.getByRole("textbox", { name: "Message" })).toHaveValue(
      prompt,
    );
    expect(screen.getByRole("button", { name: "Send" })).toBeEnabled();
    expect(generate).not.toHaveBeenCalled();
  });

  it("shows transport errors instead of silently returning the prompt", async () => {
    vi.mocked(sendMessage).mockRejectedValue(
      new Error("Body exceeded 1 MB limit."),
    );
    render(<ChatPanel tileId="tile" canvas={canvas} />);
    await send();
    expect(
      await screen.findByText("Could not reach the server."),
    ).toBeVisible();
    expect(screen.getByRole("textbox", { name: "Message" })).toHaveValue(
      prompt,
    );
    expect(generate).not.toHaveBeenCalled();
  });

  it("limits the outgoing history before the server decodes the request", async () => {
    vi.mocked(loadChat).mockResolvedValue({
      messages: Array.from({ length: MAX_HISTORY + 20 }, (_, i) => ({
        role: "user" as const,
        content: i === 0 ? "old context ".repeat(100_000) : `message ${i}`,
      })),
    });
    vi.mocked(sendMessage).mockResolvedValue({
      ok: true,
      value: { role: "assistant", content: "Hello" },
    });
    render(<ChatPanel tileId="tile" canvas={canvas} />);
    await send();
    await waitFor(() => expect(sendMessage).toHaveBeenCalledOnce());
    const [sent] = vi.mocked(sendMessage).mock.calls[0]!;
    expect(sent).toHaveLength(MAX_HISTORY);
    expect(sent.at(-1)?.content).toBe(prompt);
    expect(JSON.stringify(sent).length).toBeLessThan(10_000);
    expect(await screen.findByText("Hello")).toBeVisible();
  });

  it("ends the pending state and exposes unexpected errors during generation", async () => {
    vi.mocked(sendMessage).mockResolvedValue({
      ok: true,
      value: {
        role: "assistant",
        content: "generate",
        action: { kind: "generate", request: prompt },
      },
    });
    vi.mocked(generate).mockImplementation(async (chat) => {
      chat.setPending(true);
      throw new Error("Image conversion failed");
    });
    render(<ChatPanel tileId="tile" canvas={canvas} />);
    await send();
    expect(
      await screen.findByText("Couldn’t finish this request. Try again."),
    ).toBeVisible();
    expect(screen.queryByText("Thinking…")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send" })).toBeInTheDocument();
  });
});
