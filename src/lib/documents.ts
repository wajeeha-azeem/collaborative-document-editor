export const DEFAULT_DOCUMENT_TITLE = "Untitled document";

export const USER_ID_HEADER = "x-user-id";

export const EMPTY_DOCUMENT_HTML = "<p></p>";

export function normalizeDocumentTitle(title: string): string | null {
  const trimmed = title.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, 200);
}
