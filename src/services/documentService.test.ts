import { describe, expect, it } from "vitest";
import { DOCUMENT_TYPE_PATTERN, DOCUMENT_TYPES, documentIdOf, toDocumentRef } from "./documentService";

describe("document references kept in profile URL fields", () => {
  it("round-trips a documentId", () => {
    const ref = toDocumentRef("8d29cb84-7d17-4fb7-b98f-a94cebbd8eb2");
    expect(ref).toBe("document:8d29cb84-7d17-4fb7-b98f-a94cebbd8eb2");
    expect(documentIdOf(ref)).toBe("8d29cb84-7d17-4fb7-b98f-a94cebbd8eb2");
  });

  it("leaves plain URLs and empty values alone", () => {
    expect(documentIdOf("https://example.com/logo.png")).toBeNull();
    expect(documentIdOf("blob:http://localhost/abc")).toBeNull();
    expect(documentIdOf("document:")).toBeNull();
    expect(documentIdOf(undefined)).toBeNull();
    expect(documentIdOf("")).toBeNull();
  });
});

describe("SkoolJobs document type codes", () => {
  it("all match document-management's code rule", () => {
    for (const code of Object.values(DOCUMENT_TYPES)) {
      expect(DOCUMENT_TYPE_PATTERN.test(code), code).toBe(true);
    }
  });
});
