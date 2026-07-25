import { jsPDF } from "jspdf";

/**
 * Lightweight HTML → Markdown for the formatting we support in the editor.
 * Not a full HTML converter — good enough for export of H1/H2, lists, and marks.
 */
export function htmlToMarkdown(html: string): string {
  const trimmed = html.trim();

  if (!trimmed || trimmed === "<p></p>") {
    return "";
  }

  const withBlocks = trimmed
    .replace(/<\/h1>/gi, "\n\n")
    .replace(/<h1[^>]*>/gi, "# ")
    .replace(/<\/h2>/gi, "\n\n")
    .replace(/<h2[^>]*>/gi, "## ")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<p[^>]*>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<\/?(ul|ol)[^>]*>/gi, "\n")
    .replace(/<\/?strong[^>]*>/gi, "**")
    .replace(/<\/?b[^>]*>/gi, "**")
    .replace(/<\/?em[^>]*>/gi, "*")
    .replace(/<\/?i[^>]*>/gi, "*")
    .replace(/<\/?u[^>]*>/gi, "")
    .replace(/<[^>]+>/g, "");

  return decodeBasicEntities(withBlocks)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Plain-text blocks used for PDF layout. */
export type ExportBlock = {
  kind: "h1" | "h2" | "p" | "li";
  text: string;
};

export function htmlToExportBlocks(html: string): ExportBlock[] {
  const trimmed = html.trim();

  if (!trimmed || trimmed === "<p></p>") {
    return [];
  }

  const normalized = trimmed
    .replace(/\s+/g, " ")
    .replace(/<\/(h1|h2|p|li)>/gi, "</$1>\n")
    .replace(/<br\s*\/?>/gi, "\n");

  const blocks: ExportBlock[] = [];
  const tagRegex = /<(h1|h2|p|li)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(normalized)) !== null) {
    const kind = match[1].toLowerCase() as ExportBlock["kind"];
    const text = stripTags(match[2]).trim();

    if (text) {
      blocks.push({ kind, text });
    }
  }

  if (blocks.length === 0) {
    const fallback = stripTags(normalized).trim();
    if (fallback) {
      blocks.push({ kind: "p", text: fallback });
    }
  }

  return blocks;
}

export function downloadTextFile(
  filename: string,
  contents: string,
  mime: string,
) {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadPdfFile(title: string, html: string) {
  const basename = safeDownloadBasename(title);
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const maxWidth = pageWidth - margin * 2;
  let y = margin;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  const titleLines = doc.splitTextToSize(title || "Untitled document", maxWidth);
  ensureSpace(titleLines.length * 8 + 4);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 8 + 6;

  for (const block of htmlToExportBlocks(html)) {
    if (block.kind === "h1") {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      const lines = doc.splitTextToSize(block.text, maxWidth);
      ensureSpace(lines.length * 7 + 4);
      doc.text(lines, margin, y);
      y += lines.length * 7 + 4;
      continue;
    }

    if (block.kind === "h2") {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      const lines = doc.splitTextToSize(block.text, maxWidth);
      ensureSpace(lines.length * 6 + 3);
      doc.text(lines, margin, y);
      y += lines.length * 6 + 3;
      continue;
    }

    if (block.kind === "li") {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      const lines = doc.splitTextToSize(`• ${block.text}`, maxWidth);
      ensureSpace(lines.length * 5.5 + 2);
      doc.text(lines, margin, y);
      y += lines.length * 5.5 + 2;
      continue;
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    const lines = doc.splitTextToSize(block.text, maxWidth);
    ensureSpace(lines.length * 5.5 + 3);
    doc.text(lines, margin, y);
    y += lines.length * 5.5 + 3;
  }

  doc.save(`${basename}.pdf`);
}

export function safeDownloadBasename(title: string): string {
  const cleaned = title
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 80);

  return cleaned || "document";
}

function stripTags(value: string): string {
  return decodeBasicEntities(value.replace(/<[^>]+>/g, ""));
}

function decodeBasicEntities(value: string): string {
  return value
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}
