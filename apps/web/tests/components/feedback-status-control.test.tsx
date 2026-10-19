import { screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { renderWithUser } from "@test/render";
const mocks = vi.hoisted(() => ({ update: vi.fn() }));
vi.mock("@/features/feedback/actions", () => ({
  updateFeedbackStatus: mocks.update,
}));
import { StatusControl } from "@/features/feedback/components/status-control";

it("announces saved feedback status and keeps the new selection", async () => {
  mocks.update.mockResolvedValue({});
  const { user } = renderWithUser(<StatusControl id={7} status="open" />);
  await user.selectOptions(screen.getByRole("combobox"), "implemented");
  expect(mocks.update).toHaveBeenCalledWith(7, "implemented");
  expect(screen.getByRole("combobox")).toHaveValue("implemented");
  expect(screen.getByRole("status")).toHaveTextContent("Status saved");
});
it("keeps the last saved status and displays connection failures", async () => {
  mocks.update.mockRejectedValue(new Error("offline"));
  const { user } = renderWithUser(<StatusControl id={7} status="open" />);
  await user.selectOptions(screen.getByRole("combobox"), "implemented");
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Please try again",
  );
  expect(screen.getByRole("combobox")).toHaveValue("open");
  expect(screen.getByRole("combobox")).toBeEnabled();
});
