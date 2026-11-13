import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../../api/errors";
import { isTransientFailure, loadWithRetry } from "./loadTenant";

const network = () => new ApiError(0, "NETWORK_ERROR", "Unable to reach the server.");
const noSleep = () => Promise.resolve();

describe("loadWithRetry", () => {
  it("retries a dropped connection and returns the later success", async () => {
    const load = vi.fn().mockRejectedValueOnce(network()).mockResolvedValueOnce({ code: "SKOOLJOBS" });
    await expect(loadWithRetry(load, () => false, [500, 1500], noSleep)).resolves.toEqual({ code: "SKOOLJOBS" });
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("gives up after the last delay", async () => {
    const load = vi.fn().mockRejectedValue(network());
    await expect(loadWithRetry(load, () => false, [500, 1500], noSleep)).rejects.toBeInstanceOf(ApiError);
    expect(load).toHaveBeenCalledTimes(3);
  });

  it("does not retry a client error", async () => {
    const load = vi.fn().mockRejectedValue(new ApiError(404, "TENANT_NOT_FOUND", "Unknown tenant"));
    await expect(loadWithRetry(load, () => false, [500, 1500], noSleep)).rejects.toMatchObject({ status: 404 });
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("stops when cancelled", async () => {
    const load = vi.fn().mockRejectedValue(network());
    await expect(loadWithRetry(load, () => true, [500, 1500], noSleep)).rejects.toBeInstanceOf(ApiError);
    expect(load).toHaveBeenCalledTimes(1);
  });
});

describe("isTransientFailure", () => {
  it("is true for no response and gateway errors only", () => {
    expect(isTransientFailure(network())).toBe(true);
    expect(isTransientFailure(new ApiError(503, "HTTP_503", "Unavailable"))).toBe(true);
    expect(isTransientFailure(new ApiError(500, "HTTP_500", "Error"))).toBe(false);
    expect(isTransientFailure(new ApiError(400, "BAD", "Bad"))).toBe(false);
  });
});
