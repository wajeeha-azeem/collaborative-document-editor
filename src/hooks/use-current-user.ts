"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";

import {
  type UserSession,
  USER_SESSION_STORAGE_KEY,
  parseUserSession,
  syncUserIdCookie,
} from "@/lib/user-session";

const SESSION_CHANGE_EVENT = "cde:user-session-change";

function subscribeToUserSession(onStoreChange: () => void) {
  function handleStorage(event: StorageEvent) {
    if (event.key === USER_SESSION_STORAGE_KEY || event.key === null) {
      onStoreChange();
    }
  }

  function handleCustomChange() {
    onStoreChange();
  }

  window.addEventListener("storage", handleStorage);
  window.addEventListener(SESSION_CHANGE_EVENT, handleCustomChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(SESSION_CHANGE_EVENT, handleCustomChange);
  };
}

function getUserSessionSnapshot(): string | null {
  return window.localStorage.getItem(USER_SESSION_STORAGE_KEY);
}

function getServerSnapshot(): string | null {
  return null;
}

export function notifyUserSessionChange() {
  window.dispatchEvent(new Event(SESSION_CHANGE_EVENT));
}

export function useCurrentUser(): UserSession | null {
  const sessionRaw = useSyncExternalStore(
    subscribeToUserSession,
    getUserSessionSnapshot,
    getServerSnapshot,
  );

  const session = useMemo(() => parseUserSession(sessionRaw), [sessionRaw]);

  // Keep the server-readable cookie in sync for existing localStorage sessions.
  useEffect(() => {
    if (session) {
      syncUserIdCookie(session.id);
    }
  }, [session]);

  return session;
}
