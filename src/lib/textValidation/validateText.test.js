import { describe, expect, it } from "vitest";
import { containsProfanity, validateFields, validateText } from "./index";

describe("validateText", () => {
  it("accepts ordinary job/profile text", () => {
    expect(
      validateText("Experienced mathematics teacher for grades 9-12."),
    ).toEqual({ valid: true });
  });

  it("treats empty, blank and non-string values as valid (required checks live in forms)", () => {
    expect(validateText("")).toEqual({ valid: true });
    expect(validateText("   ")).toEqual({ valid: true });
    expect(validateText(undefined)).toEqual({ valid: true });
    expect(validateText(42)).toEqual({ valid: true });
  });

  it("rejects profanity with a user-facing reason", () => {
    const result = validateText("this is fucking great");
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/isn't allowed on SkoolJobs/);
  });

  it("catches common evasion tricks like repeated letters", () => {
    expect(containsProfanity("fuuuuck")).toBe(true);
  });
});

describe("validateFields", () => {
  it("returns valid with no errors when every field is clean", () => {
    expect(
      validateFields({ title: "Science Teacher", description: "Join our team" }),
    ).toEqual({ valid: true, errors: {} });
  });

  it("reports only the offending fields", () => {
    const { valid, errors } = validateFields({
      title: "Science Teacher",
      description: "what the fuck",
    });
    expect(valid).toBe(false);
    expect(Object.keys(errors)).toEqual(["description"]);
  });

  it("handles a missing fields object", () => {
    expect(validateFields(undefined)).toEqual({ valid: true, errors: {} });
  });
});
