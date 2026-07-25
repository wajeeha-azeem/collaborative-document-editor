import { describe, expect, it } from "vitest";

import {
  htmlToExportBlocks,
  htmlToMarkdown,
  safeDownloadBasename,
} from "@/lib/export-document";

describe("export helpers", () => {
  it("converts supported HTML marks and blocks to Markdown", () => {
    expect(
      htmlToMarkdown(
        "<h1>Title</h1><p>Hello <strong>world</strong></p><ul><li>One</li><li>Two</li></ul>",
      ),
    ).toContain("# Title");
    expect(
      htmlToMarkdown("<p>Hello <strong>world</strong></p>"),
    ).toContain("**world**");
    expect(htmlToMarkdown("<ul><li>One</li></ul>")).toContain("- One");
  });

  it("parses HTML into PDF export blocks", () => {
    expect(
      htmlToExportBlocks(
        "<h1>Title</h1><p>Hello</p><ul><li>One</li><li>Two</li></ul>",
      ),
    ).toEqual([
      { kind: "h1", text: "Title" },
      { kind: "p", text: "Hello" },
      { kind: "li", text: "One" },
      { kind: "li", text: "Two" },
    ]);
  });

  it("builds a safe download basename", () => {
    expect(safeDownloadBasename("Q1 Plan!")).toBe("Q1-Plan");
    expect(safeDownloadBasename("   ")).toBe("document");
  });
});
