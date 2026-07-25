export const DEFAULT_DOCUMENT_TITLE = "Untitled document";

export const USER_ID_HEADER = "x-user-id";

export const EMPTY_DOCUMENT_HTML = "<p></p>";

/** Soft cap for stored HTML (characters). Keeps accidental huge pastes out of SQLite. */
export const MAX_DOCUMENT_CONTENT_LENGTH = 500_000;

export function normalizeDocumentTitle(title: string): string | null {
  const trimmed = title.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, 200);
}

export function validateDocumentContent(content: string): string | null {
  if (content.length > MAX_DOCUMENT_CONTENT_LENGTH) {
    return `Content is too large. Maximum size is ${MAX_DOCUMENT_CONTENT_LENGTH.toLocaleString()} characters.`;
  }

  return null;
}
