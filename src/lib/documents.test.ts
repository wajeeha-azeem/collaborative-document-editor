import { describe, expect, it } from "vitest";

import {
  MAX_DOCUMENT_CONTENT_LENGTH,
  normalizeDocumentTitle,
  validateDocumentContent,
} from "@/lib/documents";

describe("document helpers", () => {
  it("normalizes titles and rejects empty values", () => {
    expect(normalizeDocumentTitle("  Notes  ")).toBe("Notes");
    expect(normalizeDocumentTitle("   ")).toBeNull();
    expect(normalizeDocumentTitle("a".repeat(250))?.length).toBe(200);
  });

  it("rejects oversized document content", () => {
    expect(validateDocumentContent("<p>ok</p>")).toBeNull();
    expect(
      validateDocumentContent("x".repeat(MAX_DOCUMENT_CONTENT_LENGTH + 1)),
    ).toMatch(/too large/i);
  });
});
