import { describe, expect, it, vi } from "vitest";
import { retryFileOperation } from "../scripts/assets/lib/file-io.ts";

describe("asset file retries", () => {
  it("recovers from a transient Windows open error", () => {
    const operation = vi.fn()
      .mockImplementationOnce(() => { throw Object.assign(new Error("open"), { code: "UNKNOWN" }); })
      .mockReturnValue("ready");

    expect(retryFileOperation(operation)).toBe("ready");
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it("does not retry a missing file", () => {
    const error = Object.assign(new Error("missing"), { code: "ENOENT" });
    const operation = vi.fn(() => { throw error; });

    expect(() => retryFileOperation(operation)).toThrow(error);
    expect(operation).toHaveBeenCalledTimes(1);
  });
});
