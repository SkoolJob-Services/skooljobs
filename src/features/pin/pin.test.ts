import { beforeEach, describe, expect, it } from "vitest";
import { deviceStore } from "./deviceStore";
import { guessDeviceName, isTooSimple, newPinErrors } from "./pinRules";

describe("PIN rules (same as the signup service)", () => {
  it("refuses PINs that are easy to guess", () => {
    for (const pin of ["000000", "111111", "123456", "234567", "654321", "987654", "121212", "123123", "909090"]) {
      expect(isTooSimple(pin), pin).toBe(true);
    }
    for (const pin of ["482915", "190274", "112358", "204801"]) {
      expect(isTooSimple(pin), pin).toBe(false);
    }
  });

  it("checks the PIN and its confirmation", () => {
    expect(newPinErrors("4829", "")).toEqual({ pin: "Enter 6 digits." });
    expect(newPinErrors("123456", "123456").pin).toBeDefined();
    expect(newPinErrors("482915", "48291").confirm).toBe("Enter the PIN again.");
    expect(newPinErrors("482915", "482916").confirm).toBe("The PINs don't match.");
    expect(newPinErrors("482915", "482915")).toEqual({});
  });

  it("names the device from the browser", () => {
    const android = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36";
    const iphone = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
    expect(guessDeviceName(android)).toBe("Android · Chrome");
    expect(guessDeviceName(iphone)).toBe("iPhone · Safari");
    expect(guessDeviceName("")).toBe("This device");
  });
});

describe("accounts saved on this device", () => {
  const memory = new Map<string, string>();
  beforeEach(() => {
    memory.clear();
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: (k: string) => memory.get(k) ?? null,
      setItem: (k: string, v: string) => void memory.set(k, v),
      removeItem: (k: string) => void memory.delete(k),
    };
  });

  it("lists this tenant's accounts, most recently used first, and forgets removed ones", () => {
    deviceStore.save({ deviceId: "a", deviceSecret: "s", label: "Reena", tenantId: "SKOOLJOBS", savedAt: "2026-11-01T00:00:00Z" });
    deviceStore.save({ deviceId: "b", deviceSecret: "s", label: "Sanjay", tenantId: "SKOOLJOBS", savedAt: "2026-11-02T00:00:00Z" });
    deviceStore.save({ deviceId: "c", deviceSecret: "s", label: "Other school", tenantId: "OTHER" });
    expect(deviceStore.list("SKOOLJOBS").map((d) => d.label)).toEqual(["Sanjay", "Reena"]);

    deviceStore.touch("a");
    expect(deviceStore.list("SKOOLJOBS")[0].label).toBe("Reena");

    deviceStore.remove("a");
    expect(deviceStore.list("SKOOLJOBS").map((d) => d.deviceId)).toEqual(["b"]);
  });

  it("replaces the account's old device entry when a new PIN renews it", () => {
    deviceStore.save({ deviceId: "old", deviceSecret: "s1", label: "Reena", tenantId: "T" });
    deviceStore.save({ deviceId: "new", deviceSecret: "s2", label: "Reena", tenantId: "T" }, ["old"]);
    expect(deviceStore.list("T").map((d) => d.deviceId)).toEqual(["new"]);
  });

  it("ignores damaged storage", () => {
    memory.set("cst.pin.devices", "{not json");
    expect(deviceStore.list("T")).toEqual([]);
  });
});
