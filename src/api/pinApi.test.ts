import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from "axios";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { http } from "./httpClient";
import { httpPinApi } from "./pinApi";

type Call = { method: string; url: string; params?: unknown; body?: unknown };
let calls: Call[];
let replies: { status: number; data?: unknown }[];
const originalAdapter = http.defaults.adapter;

beforeEach(() => {
  calls = [];
  replies = [];
  http.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    calls.push({
      method: (config.method ?? "get").toUpperCase(),
      url: (config.url ?? "").replace(/^.*?(\/auth\/)/, "$1"),
      params: config.params,
      body: typeof config.data === "string" ? JSON.parse(config.data) : config.data,
    });
    const next = replies.shift() ?? { status: 200, data: {} };
    const response = { data: next.data, status: next.status, statusText: "", headers: new AxiosHeaders(), config };
    if (next.status >= 400) throw new AxiosError("failed", "ERR_BAD_REQUEST", config, null, response);
    return response;
  };
});

afterEach(() => {
  http.defaults.adapter = originalAdapter;
});

describe("signup PIN endpoints through @app/signup-api PinApi", () => {
  test("each action calls the signup endpoint with the contract's body", async () => {
    replies.push(
      { status: 200, data: { success: true, message: "ok", accessToken: "a", refreshToken: "r", sessionId: "s" } },
      { status: 200, data: { pinSet: true, devices: [{ deviceId: "d1", name: "Phone", current: true }, { name: "no id" }] } },
      { status: 200, data: { success: true, device: { deviceId: "d2", deviceSecret: "sec", deviceName: "Laptop" } } },
      { status: 200, data: { success: true, device: { deviceId: "d3", deviceSecret: "sec3" } } },
      { status: 200, data: { success: true, message: "changed" } },
      { status: 200, data: { success: true, message: "removed" } },
    );
    expect((await httpPinApi.pinLogin({ deviceId: "d1", deviceSecret: "x", pin: "482913" })).accessToken).toBe("a");
    const status = await httpPinApi.getPinStatus("d1");
    expect(status).toEqual({ pinSet: true, locked: false, devices: [{ deviceId: "d1", name: "Phone", addedAt: undefined, lastUsedAt: undefined, current: true }] });
    expect((await httpPinApi.setPin({ pin: "482913", deviceName: "Laptop" })).device).toEqual({ deviceId: "d2", deviceSecret: "sec", deviceName: "Laptop" });
    expect((await httpPinApi.trustDevice({ pin: "482913" })).device.deviceId).toBe("d3");
    expect((await httpPinApi.changePin({ currentPin: "482913", pin: "731946" })).message).toBe("changed");
    expect((await httpPinApi.removeDevice("d 1")).message).toBe("removed");

    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual([
      "POST /auth/login/pin",
      "GET /auth/pin?deviceId=d1",
      "POST /auth/pin",
      "POST /auth/devices/trust",
      "POST /auth/pin/change",
      "POST /auth/devices/d%201/remove",
    ]);
    expect(calls[0].body).toEqual({ deviceId: "d1", deviceSecret: "x", pin: "482913" });
    expect(calls[4].body).toEqual({ currentPin: "482913", pin: "731946" });
  });

  test("set PIN without device credentials in the answer is an error", async () => {
    replies.push({ status: 200, data: { success: true } });
    await expect(httpPinApi.setPin({ pin: "482913" })).rejects.toMatchObject({ code: "PIN_DEVICE_MISSING" });
  });
});
