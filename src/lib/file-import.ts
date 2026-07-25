import mammoth from "mammoth";

import {
  EMPTY_DOCUMENT_HTML,
  normalizeDocumentTitle,
} from "@/lib/documents";

export const ALLOWED_IMPORT_EXTENSIONS = [".txt", ".md", ".docx"] as const;

export const MAX_IMPORT_FILE_BYTES = 5_000_000;

export type AllowedImportExtension = (typeof ALLOWED_IMPORT_EXTENSIONS)[number];

export function getFileExtension(fileName: string): string {
  const index = fileName.lastIndexOf(".");

  if (index < 0) {
    return "";
  }

  return fileName.slice(index).toLowerCase();
}

export function isAllowedImportFile(file: File): boolean {
  const extension = getFileExtension(file.name);
  return ALLOWED_IMPORT_EXTENSIONS.includes(
    extension as AllowedImportExtension,
  );
}

export function titleFromFileName(fileName: string): string {
  const extension = getFileExtension(fileName);
  const baseName =
    extension.length > 0 ? fileName.slice(0, -extension.length) : fileName;
  return normalizeDocumentTitle(baseName) ?? "Imported document";
}

export function validateImportFile(file: File): string | null {
  const extension = getFileExtension(file.name);

  if (extension === ".doc") {
    return "Classic .doc files aren’t supported. Save as .docx and try again.";
  }

  if (!isAllowedImportFile(file)) {
    return "Only .txt, .md, and .docx files are supported.";
  }

  if (file.size === 0) {
    return "The selected file is empty.";
  }

  if (file.size > MAX_IMPORT_FILE_BYTES) {
    return "File is too large. Maximum size is 5 MB.";
  }

  return null;
}

export function fileContentsToHtml(text: string, fileName: string): string {
  const extension = getFileExtension(fileName);
  const normalized = text.replace(/\r\n/g, "\n").trim();

  if (!normalized) {
    return EMPTY_DOCUMENT_HTML;
  }

  if (extension === ".md") {
    return markdownToHtml(normalized);
  }

  return plainTextToHtml(normalized);
}

export async function importFile(file: File): Promise<{
  title: string;
  content: string;
}> {
  const validationError = validateImportFile(file);

  if (validationError) {
    throw new Error(validationError);
  }

  const title = titleFromFileName(file.name);
  const extension = getFileExtension(file.name);

  if (extension === ".docx") {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    const content = result.value.trim() ? result.value : EMPTY_DOCUMENT_HTML;
    return { title, content };
  }

  const text = await readFileAsText(file);
  return {
    title,
    content: fileContentsToHtml(text, file.name),
  };
}

function plainTextToHtml(text: string): string {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`);

  return paragraphs.join("") || EMPTY_DOCUMENT_HTML;
}

function markdownToHtml(text: string): string {
  const blocks = text.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
  const htmlParts: string[] = [];

  for (const block of blocks) {
    const lines = block.split("\n");

    if (lines.every((line) => /^[-*]\s+/.test(line))) {
      const items = lines
        .map((line) => line.replace(/^[-*]\s+/, ""))
        .map((item) => `<li>${inlineMarkdown(item)}</li>`)
        .join("");
      htmlParts.push(`<ul>${items}</ul>`);
      continue;
    }

    if (lines.every((line) => /^\d+\.\s+/.test(line))) {
      const items = lines
        .map((line) => line.replace(/^\d+\.\s+/, ""))
        .map((item) => `<li>${inlineMarkdown(item)}</li>`)
        .join("");
      htmlParts.push(`<ol>${items}</ol>`);
      continue;
    }

    if (lines.length === 1 && /^##\s+/.test(lines[0])) {
      htmlParts.push(`<h2>${inlineMarkdown(lines[0].replace(/^##\s+/, ""))}</h2>`);
      continue;
    }

    if (lines.length === 1 && /^#\s+/.test(lines[0])) {
      htmlParts.push(`<h1>${inlineMarkdown(lines[0].replace(/^#\s+/, ""))}</h1>`);
      continue;
    }

    htmlParts.push(
      `<p>${lines.map((line) => inlineMarkdown(line)).join("<br>")}</p>`,
    );
  }

  return htmlParts.join("") || EMPTY_DOCUMENT_HTML;
}

function inlineMarkdown(text: string): string {
  const escaped = escapeHtml(text);
  return escaped
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/__(.+?)__/g, "<u>$1</u>");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Could not read the file as text."));
        return;
      }

      resolve(reader.result);
    };

    reader.onerror = () => {
      reject(new Error("Failed to read the selected file."));
    };

    reader.readAsText(file);
  });
}
