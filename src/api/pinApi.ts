import { PinApi as GeneratedPinApi, type PinSetResponse, type SignupApi } from "@app/signup-api";
import { config } from "../config/env";
import { sessionStore } from "../features/auth/sessionStore";
import { isTooSimple } from "../features/pin/pinRules";
import { ApiError } from "./errors";
import { apiConfiguration, http } from "./httpClient";
import type { LoginResponse, SuccessResponse } from "./types";

/*
 * PIN login on trusted devices — signup's Pin endpoints through the generated
 * PinApi of @app/signup-api (POST /auth/login/pin, GET/POST /auth/pin,
 * POST /auth/devices/trust, POST /auth/pin/change, POST /auth/devices/{id}/remove).
 */

export interface DeviceCredentials {
  deviceId: string;
  deviceSecret: string;
  deviceName?: string;
}

export interface PinSettings {
  enabled: boolean;
  length: number;
  maxAttempts: number;
}

export interface TrustedDevice {
  deviceId: string;
  name?: string;
  addedAt?: string;
  lastUsedAt?: string;
  current?: boolean;
}

export interface PinStatus {
  pinSet: boolean;
  locked: boolean;
  devices: TrustedDevice[];
}

export interface PinSetResult {
  success?: boolean;
  message?: string;
  device: DeviceCredentials;
}

export interface PinApi {
  pinLogin(body: { deviceId: string; deviceSecret: string; pin: string }): Promise<LoginResponse>;
  getPinStatus(deviceId?: string): Promise<PinStatus>;
  setPin(body: { pin: string; deviceName?: string; deviceId?: string }): Promise<PinSetResult>;
  trustDevice(body: { pin: string; deviceName?: string }): Promise<PinSetResult>;
  changePin(body: { currentPin: string; pin: string }): Promise<SuccessResponse>;
  removeDevice(deviceId: string): Promise<SuccessResponse>;
}

type GeneratedAxios = ConstructorParameters<typeof SignupApi>[2];
const generatedPinApi = new GeneratedPinApi(apiConfiguration, undefined, http as unknown as GeneratedAxios);

/** The server's answer to "set PIN" / "trust device": the device secret must be there. */
function toPinSetResult(data: PinSetResponse): PinSetResult {
  const device = data.device;
  if (!device?.deviceId || !device.deviceSecret) {
    throw new ApiError(500, "PIN_DEVICE_MISSING", "The server didn't return the device details. Please try again.");
  }
  return {
    success: data.success,
    message: data.message,
    device: { deviceId: device.deviceId, deviceSecret: device.deviceSecret, deviceName: device.deviceName },
  };
}

export const httpPinApi: PinApi = {
  async pinLogin(body) {
    return (await generatedPinApi.pinLogin(body)).data;
  },
  async getPinStatus(deviceId) {
    const { data } = await generatedPinApi.getPinStatus(deviceId);
    return {
      pinSet: !!data.pinSet,
      locked: !!data.locked,
      devices: (data.devices ?? [])
        .filter((d) => !!d.deviceId)
        .map((d) => ({ deviceId: d.deviceId as string, name: d.name, addedAt: d.addedAt, lastUsedAt: d.lastUsedAt, current: d.current })),
    };
  },
  async setPin(body) {
    return toPinSetResult((await generatedPinApi.setPin(body)).data);
  },
  async trustDevice(body) {
    return toPinSetResult((await generatedPinApi.trustDevice(body)).data);
  },
  async changePin(body) {
    return (await generatedPinApi.changePin(body)).data;
  },
  async removeDevice(deviceId) {
    return (await generatedPinApi.removeDevice(deviceId)).data;
  },
};

// ---------------------------------------------------------------------------
// Mock (npm run dev:mock): one PIN per identifier, kept in localStorage.
// ---------------------------------------------------------------------------

interface MockAccount {
  pin?: string;
  failed: number;
  locked: boolean;
  devices: { deviceId: string; secret: string; name: string; addedAt: string; lastUsedAt?: string }[];
}

const MOCK_KEY = "skooljobs_mock_pins";
const MAX_ATTEMPTS = 5;

function mockRead(): Record<string, MockAccount> {
  try {
    return JSON.parse(localStorage.getItem(MOCK_KEY) ?? "{}") as Record<string, MockAccount>;
  } catch {
    return {};
  }
}

function mockWrite(accounts: Record<string, MockAccount>): void {
  localStorage.setItem(MOCK_KEY, JSON.stringify(accounts));
}

function mockAccount(): [string, MockAccount, Record<string, MockAccount>] {
  const identifier = sessionStore.load()?.identifier;
  if (!identifier) throw new ApiError(401, "LOGIN_REQUIRED", "Log in first.");
  const accounts = mockRead();
  const account = accounts[identifier] ?? { failed: 0, locked: false, devices: [] };
  accounts[identifier] = account;
  return [identifier, account, accounts];
}

function mockCheck(account: MockAccount, pin: string, accounts: Record<string, MockAccount>) {
  if (!account.pin) throw new ApiError(409, "PIN_NOT_SET", "No PIN is set for this account.");
  if (account.locked) throw new ApiError(423, "PIN_LOCKED", "Too many wrong PINs. Log in with a code and set a new PIN.");
  if (account.pin !== pin) {
    account.failed += 1;
    account.locked = account.failed >= MAX_ATTEMPTS;
    mockWrite(accounts);
    const left = MAX_ATTEMPTS - account.failed;
    if (account.locked) throw new ApiError(423, "PIN_LOCKED", "Too many wrong PINs. Log in with a code and set a new PIN.");
    throw new ApiError(401, "PIN_INVALID", `Wrong PIN. ${left} ${left === 1 ? "try" : "tries"} left.`);
  }
  account.failed = 0;
}

function mockNewPin(pin: string) {
  if (!/^\d{6}$/.test(pin)) throw new ApiError(400, "PIN_FORMAT", "The PIN must be 6 digits.");
  if (isTooSimple(pin)) throw new ApiError(400, "PIN_TOO_SIMPLE", "Choose a PIN that is harder to guess.");
}

function mockTrust(account: MockAccount, name?: string, existing?: string): DeviceCredentials {
  const secret = `mock-secret-${Math.random().toString(36).slice(2)}`;
  const found = existing ? account.devices.find((d) => d.deviceId === existing) : undefined;
  if (found) {
    found.secret = secret;
    return { deviceId: found.deviceId, deviceSecret: secret, deviceName: found.name };
  }
  const device = { deviceId: `mock-device-${Date.now()}`, secret, name: name || "This device", addedAt: new Date().toISOString() };
  account.devices.push(device);
  return { deviceId: device.deviceId, deviceSecret: secret, deviceName: device.name };
}

/** Mock: lets SignupVerifyPage's PIN work without the server (identifier = the new account). */
export function mockSignupPin(identifier: string, pin: string, deviceName?: string): DeviceCredentials {
  mockNewPin(pin);
  const accounts = mockRead();
  const account: MockAccount = accounts[identifier] ?? { failed: 0, locked: false, devices: [] };
  account.pin = pin;
  account.failed = 0;
  account.locked = false;
  const device = mockTrust(account, deviceName);
  accounts[identifier] = account;
  mockWrite(accounts);
  return device;
}

const wait = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));

export const mockPinApi: PinApi = {
  async pinLogin(body) {
    await wait();
    const accounts = mockRead();
    const entry = Object.entries(accounts).find(([, a]) =>
      a.devices.some((d) => d.deviceId === body.deviceId && d.secret === body.deviceSecret),
    );
    if (!entry) throw new ApiError(401, "DEVICE_NOT_TRUSTED", "This device can't log in with a PIN. Log in with a code.");
    const [identifier, account] = entry;
    mockCheck(account, body.pin, accounts);
    const device = account.devices.find((d) => d.deviceId === body.deviceId)!;
    device.lastUsedAt = new Date().toISOString();
    mockWrite(accounts);
    // Same token shape as the mock OTP login (role from the identifier).
    const { mockAuthApi } = await import("./mockAuthApi");
    const { sessionId } = await mockAuthApi.requestLoginOtp({ identifier });
    return mockAuthApi.verifyLoginOtp({ identifier, otp: "123456" }, sessionId);
  },
  async getPinStatus(deviceId) {
    await wait(200);
    const [, account] = mockAccount();
    return {
      pinSet: !!account.pin,
      locked: account.locked,
      devices: account.devices.map((d) => ({ ...d, secret: undefined, current: d.deviceId === deviceId })),
    };
  },
  async setPin(body) {
    await wait();
    mockNewPin(body.pin);
    const [, account, accounts] = mockAccount();
    account.pin = body.pin;
    account.failed = 0;
    account.locked = false;
    const device = mockTrust(account, body.deviceName, body.deviceId);
    mockWrite(accounts);
    return { success: true, message: "Your PIN is set.", device };
  },
  async trustDevice(body) {
    await wait();
    const [, account, accounts] = mockAccount();
    mockCheck(account, body.pin, accounts);
    const device = mockTrust(account, body.deviceName);
    mockWrite(accounts);
    return { success: true, message: "This device can now log in with your PIN.", device };
  },
  async changePin(body) {
    await wait();
    mockNewPin(body.pin);
    const [, account, accounts] = mockAccount();
    mockCheck(account, body.currentPin, accounts);
    account.pin = body.pin;
    mockWrite(accounts);
    return { success: true, message: "Your PIN is changed." };
  },
  async removeDevice(deviceId) {
    await wait(200);
    const [, account, accounts] = mockAccount();
    const before = account.devices.length;
    account.devices = account.devices.filter((d) => d.deviceId !== deviceId);
    if (account.devices.length === before) throw new ApiError(404, "DEVICE_NOT_FOUND", "That device is not in your list.");
    mockWrite(accounts);
    return { success: true, message: "Removed." };
  },
};

// The mock issues unsigned tokens: never in a production build (same rule as api/index.ts).
export const pinApi: PinApi = import.meta.env.DEV && config.useMockApi ? mockPinApi : httpPinApi;
