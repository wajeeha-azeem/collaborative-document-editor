export const USER_SESSION_STORAGE_KEY = "cde:current-user";

export type UserSession = {
  id: string;
  name: string;
};

export function parseUserSession(value: string | null): UserSession | null {
  if (!value) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(value);

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("id" in parsed) ||
      !("name" in parsed) ||
      typeof parsed.id !== "string" ||
      typeof parsed.name !== "string" ||
      parsed.id.length === 0 ||
      parsed.name.length === 0
    ) {
      return null;
    }

    return { id: parsed.id, name: parsed.name };
  } catch {
    return null;
  }
}

export function readUserSession(): UserSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  return parseUserSession(window.localStorage.getItem(USER_SESSION_STORAGE_KEY));
}

export function writeUserSession(user: UserSession): void {
  window.localStorage.setItem(USER_SESSION_STORAGE_KEY, JSON.stringify(user));
}

export function clearUserSession(): void {
  window.localStorage.removeItem(USER_SESSION_STORAGE_KEY);
}
