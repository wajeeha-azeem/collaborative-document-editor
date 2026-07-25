"use client";

import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { ErrorMessage } from "@/components/error-message";
import { useCurrentUser } from "@/hooks/use-current-user";
import { apiFetch } from "@/lib/api-client";
import { readApiError } from "@/lib/api-error";

type ShareUser = {
  id: string;
  name: string;
};

type DocumentShare = {
  id: string;
  userId: string;
  userName: string;
};

type DocumentShareFormProps = {
  documentId: string;
  selectId?: string;
};

export function DocumentShareForm({
  documentId,
  selectId = "share-user",
}: DocumentShareFormProps) {
  const currentUser = useCurrentUser();
  const [users, setUsers] = useState<ShareUser[]>([]);
  const [shares, setShares] = useState<DocumentShare[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSharing, startShareTransition] = useTransition();

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    let cancelled = false;
    const userId = currentUser.id;

    async function loadShareData() {
      setIsLoading(true);
      setError(null);

      try {
        const [usersResponse, sharesResponse] = await Promise.all([
          apiFetch("/api/users", { userId }),
          apiFetch(`/api/documents/${documentId}/shares`, { userId }),
        ]);

        if (!usersResponse.ok) {
          throw new Error(
            await readApiError(usersResponse, "Failed to load users."),
          );
        }

        if (!sharesResponse.ok) {
          throw new Error(
            await readApiError(sharesResponse, "Failed to load shares."),
          );
        }

        const usersData = (await usersResponse.json()) as { users: ShareUser[] };
        const sharesData = (await sharesResponse.json()) as {
          shares: DocumentShare[];
        };

        if (!cancelled) {
          setUsers(usersData.users);
          setShares(sharesData.shares);
          setSelectedUserId((current) => {
            if (current && usersData.users.some((user) => user.id === current)) {
              return current;
            }
            return usersData.users[0]?.id ?? "";
          });
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load sharing options.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadShareData();

    return () => {
      cancelled = true;
    };
  }, [currentUser, documentId]);

  const availableUsers = users.filter(
    (user) => !shares.some((share) => share.userId === user.id),
  );

  function handleShare() {
    if (!currentUser || !selectedUserId || isSharing) {
      return;
    }

    setError(null);

    startShareTransition(async () => {
      try {
        const response = await apiFetch(`/api/documents/${documentId}/shares`, {
          method: "POST",
          userId: currentUser.id,
          body: JSON.stringify({ userId: selectedUserId }),
        });

        if (!response.ok) {
          throw new Error(
            await readApiError(response, "Failed to share document."),
          );
        }

        const share = (await response.json()) as DocumentShare;
        setShares((current) => [...current, share]);
        setSelectedUserId((current) =>
          current === share.userId ? "" : current,
        );
      } catch (shareError) {
        setError(
          shareError instanceof Error
            ? shareError.message
            : "Failed to share document.",
        );
      }
    });
  }

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground">Loading sharing options…</p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="sr-only" htmlFor={selectId}>
          Share with user
        </label>
        <select
          id={selectId}
          value={
            availableUsers.some((user) => user.id === selectedUserId)
              ? selectedUserId
              : (availableUsers[0]?.id ?? "")
          }
          onChange={(event) => setSelectedUserId(event.target.value)}
          disabled={availableUsers.length === 0 || isSharing}
          className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 sm:max-w-xs"
        >
          {availableUsers.length === 0 ? (
            <option value="">Everyone available already has access</option>
          ) : (
            availableUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))
          )}
        </select>
        <Button
          type="button"
          size="lg"
          className="h-11"
          onClick={handleShare}
          disabled={availableUsers.length === 0 || !selectedUserId || isSharing}
        >
          {isSharing ? "Sharing…" : "Give access"}
        </Button>
      </div>

      {shares.length > 0 ? (
        <ul className="flex flex-wrap gap-2" aria-label="People with access">
          {shares.map((share) => (
            <li
              key={share.id}
              className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/80 py-1.5 pr-3 pl-1.5 text-sm"
            >
              <span
                className="flex size-7 items-center justify-center rounded-full bg-mist text-xs font-semibold text-ink"
                aria-hidden
              >
                {share.userName.slice(0, 1)}
              </span>
              <span className="font-medium text-foreground">
                {share.userName}
              </span>
              <span className="text-xs text-muted-foreground">Can edit</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          Not shared with anyone yet.
        </p>
      )}

      {error ? <ErrorMessage>{error}</ErrorMessage> : null}
    </div>
  );
}
