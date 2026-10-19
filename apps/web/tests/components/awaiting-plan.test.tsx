import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ confirm: vi.fn(), refresh: vi.fn() }));
vi.mock("@/features/billing/actions", () => ({
  confirmCheckout: mocks.confirm,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));
import { AwaitingPlan } from "@/features/billing/components/awaiting-plan";

beforeEach(() => {
  vi.useFakeTimers();
  mocks.confirm.mockResolvedValue(true);
});
afterEach(() => vi.useRealTimers());

describe("checkout activation while awaiting a plan", () => {
  it("verifies the returned checkout immediately and refreshes the account", async () => {
    render(<AwaitingPlan checkoutId="ch_example" />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(mocks.confirm).toHaveBeenCalledWith("ch_example");
    expect(mocks.refresh).toHaveBeenCalled();
  });
  it("does not overlap verification requests and stops polling on unmount", async () => {
    let resolve!: (value: boolean) => void;
    mocks.confirm.mockReturnValue(
      new Promise<boolean>((done) => {
        resolve = done;
      }),
    );
    const view = render(<AwaitingPlan checkoutId="ch_example" />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });
    expect(mocks.confirm).toHaveBeenCalledTimes(1);
    view.unmount();
    await act(async () => {
      resolve(true);
      await vi.advanceTimersByTimeAsync(6000);
    });
    expect(mocks.refresh).not.toHaveBeenCalled();
    expect(mocks.confirm).toHaveBeenCalledTimes(1);
  });
  it("still checks webhook updates when there is no checkout in the URL", async () => {
    render(<AwaitingPlan />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(mocks.confirm).not.toHaveBeenCalled();
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });
});

it("offers a fresh confirmation attempt after polling times out", async () => {
  mocks.confirm.mockRejectedValue(new Error("temporarily unavailable"));
  const view = render(<AwaitingPlan checkoutId="ch_example" />);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(30_000);
  });
  expect(view.getByText(/You don’t need to pay again/)).toBeInTheDocument();
  const calls = mocks.confirm.mock.calls.length;
  await act(async () => {
    await vi.advanceTimersByTimeAsync(10_000);
  });
  expect(mocks.confirm).toHaveBeenCalledTimes(calls);
  await act(async () => {
    view.getByRole("button", { name: "Check again" }).click();
  });
  expect(mocks.confirm).toHaveBeenCalledTimes(calls + 1);
  expect(view.getByRole("status")).toHaveTextContent(
    "Finishing your subscription",
  );
});
