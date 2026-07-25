import { USER_ID_HEADER } from "@/lib/documents";

type ApiFetchOptions = RequestInit & {
  userId: string;
};

export function apiFetch(path: string, { userId, headers, ...init }: ApiFetchOptions) {
  const nextHeaders = new Headers(headers);
  nextHeaders.set(USER_ID_HEADER, userId);

  if (
    init.body !== undefined &&
    !nextHeaders.has("Content-Type") &&
    !(init.body instanceof FormData)
  ) {
    nextHeaders.set("Content-Type", "application/json");
  }

  return fetch(path, {
    ...init,
    headers: nextHeaders,
  });
}
