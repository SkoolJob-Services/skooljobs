import { describe, expect, it } from "vitest";
import { toOptions, toOptionsMap } from "./selectOptions";

describe("toOptions", () => {
  it("maps plain dropdown strings to { label, value } pairs", () => {
    expect(toOptions(["CBSE", "ICSE"])).toEqual([
      { label: "CBSE", value: "CBSE" },
      { label: "ICSE", value: "ICSE" },
    ]);
  });

  it("passes through items that are already option objects", () => {
    const option = { label: "State Board", value: "STATE" };
    expect(toOptions([option])).toEqual([option]);
  });

  it("returns an empty list for a missing catalog", () => {
    expect(toOptions(undefined)).toEqual([]);
    expect(toOptions(null)).toEqual([]);
  });
});

describe("toOptionsMap", () => {
  it("normalizes every catalog in a dropdown JSON object", () => {
    expect(toOptionsMap({ Medium: ["English"], Level: ["Primary"] })).toEqual({
      Medium: [{ label: "English", value: "English" }],
      Level: [{ label: "Primary", value: "Primary" }],
    });
  });
});
