import { describe, expect, it } from "vitest";

import {
  fileContentsToHtml,
  titleFromFileName,
  validateImportFile,
} from "@/lib/file-import";

function fakeFile(name: string, size: number): File {
  return { name, size } as File;
}

describe("file import", () => {
  it("rejects unsupported file types", () => {
    expect(validateImportFile(fakeFile("notes.pdf", 120))).toBe(
      "Only .txt, .md, and .docx files are supported.",
    );
  });

  it("rejects classic .doc with a helpful message", () => {
    expect(validateImportFile(fakeFile("legacy.doc", 120))).toBe(
      "Classic .doc files aren’t supported. Save as .docx and try again.",
    );
  });

  it("rejects empty files", () => {
    expect(validateImportFile(fakeFile("notes.txt", 0))).toBe(
      "The selected file is empty.",
    );
  });

  it("accepts txt, md, and docx files", () => {
    expect(validateImportFile(fakeFile("notes.txt", 12))).toBeNull();
    expect(validateImportFile(fakeFile("readme.md", 12))).toBeNull();
    expect(validateImportFile(fakeFile("brief.docx", 12))).toBeNull();
  });

  it("uses the file name as the document title", () => {
    expect(titleFromFileName("Meeting Notes.md")).toBe("Meeting Notes");
    expect(titleFromFileName("Quarterly.docx")).toBe("Quarterly");
  });

  it("converts plain text into editable HTML paragraphs", () => {
    expect(fileContentsToHtml("Hello\n\nWorld", "notes.txt")).toBe(
      "<p>Hello</p><p>World</p>",
    );
  });

  it("converts basic markdown into formatted HTML", () => {
    const html = fileContentsToHtml("# Title\n\n- one\n- two", "notes.md");

    expect(html).toContain("<h1>Title</h1>");
    expect(html).toContain("<ul>");
    expect(html).toContain("<li>one</li>");
    expect(html).toContain("<li>two</li>");
  });
});
