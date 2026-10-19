import { describe, expect, it } from "vitest";
import {
  humanizeCode,
  isEmail,
  isValidE164,
  maskEmail,
  maskIdentifier,
  maskPhone,
  normalizeIdentifier,
  toE164,
} from "./contact";

describe("toE164", () => {
  it("joins country code and local number, dropping spaces and leading zeros", () => {
    expect(toE164("+91", "098765 43210")).toBe("+919876543210");
  });
  it("returns an empty string for an empty number", () => {
    expect(toE164("+91", "  ")).toBe("");
  });
});

describe("isValidE164", () => {
  it("accepts valid numbers", () => {
    expect(isValidE164("+919876543210")).toBe(true);
    expect(isValidE164("+15551234567")).toBe(true);
  });
  it("rejects malformed numbers", () => {
    expect(isValidE164("919876543210")).toBe(false);
    expect(isValidE164("+0123456789")).toBe(false);
    expect(isValidE164("+12")).toBe(false);
  });
});

describe("isEmail", () => {
  it("validates email addresses", () => {
    expect(isEmail("john.doe@example.com")).toBe(true);
    expect(isEmail("john.doe@example")).toBe(false);
    expect(isEmail("not an email")).toBe(false);
  });
});

describe("normalizeIdentifier", () => {
  it("lower-cases emails", () => {
    expect(normalizeIdentifier("  John.Doe@Example.com ")).toEqual({ kind: "email", value: "john.doe@example.com" });
  });
  it("keeps phone numbers that already have a country code", () => {
    expect(normalizeIdentifier("+1 555 123 4567")).toEqual({ kind: "phone", value: "+15551234567" });
  });
  it("adds the default country code (+91) to local numbers", () => {
    expect(normalizeIdentifier("98765 43210")).toEqual({ kind: "phone", value: "+919876543210" });
  });
  it("returns null for invalid input", () => {
    expect(normalizeIdentifier("")).toBeNull();
    expect(normalizeIdentifier("john@")).toBeNull();
    expect(normalizeIdentifier("12")).toBeNull();
  });
});

describe("masking", () => {
  it("masks emails", () => {
    expect(maskEmail("john@example.com")).toBe("j***@example.com");
  });
  it("masks phone numbers, keeping the last four digits", () => {
    expect(maskPhone("+919876543210")).toBe("+********3210");
  });
  it("picks the right mask for an identifier", () => {
    expect(maskIdentifier("john@example.com")).toBe("j***@example.com");
    expect(maskIdentifier("+919876543210")).toBe("+********3210");
  });
});

describe("humanizeCode", () => {
  it("turns API codes into readable labels", () => {
    expect(humanizeCode("SHIPPER_ADMIN")).toBe("Shipper admin");
    expect(humanizeCode("PARENT")).toBe("Parent");
  });
});
