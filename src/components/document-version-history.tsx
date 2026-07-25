"use client";

import { useEffect, useState } from "react";
import { History } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ErrorMessage } from "@/components/error-message";
import { useCurrentUser } from "@/hooks/use-current-user";
import { apiFetch } from "@/lib/api-client";
import { readApiError } from "@/lib/api-error";

type DocumentVersionItem = {
  id: string;
  title: string;
  createdAt: string;
  createdByName: string;
};

type DocumentVersionHistoryProps = {
  documentId: string;
  canEdit: boolean;
  onRestored: (payload: {
    title: string;
    content: string;
    updatedAt: string;
  }) => void;
  open: boolean;
  onClose: () => void;
};

export function DocumentVersionHistory({
  documentId,
  canEdit,
  onRestored,
  open,
  onClose,
}: DocumentVersionHistoryProps) {
  const currentUser = useCurrentUser();
  const [versions, setVersions] = useState<DocumentVersionItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !currentUser) {
      return;
    }

    let cancelled = false;
    const userId = currentUser.id;

    async function loadVersions() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await apiFetch(
          `/api/documents/${documentId}/versions`,
          { userId },
        );

        if (!response.ok) {
          throw new Error(
            await readApiError(response, "Failed to load version history."),
          );
        }

        const data = (await response.json()) as {
          versions: DocumentVersionItem[];
        };

        if (!cancelled) {
          setVersions(data.versions);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load version history.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadVersions();

    return () => {
      cancelled = true;
    };
  }, [open, currentUser, documentId]);

  async function handleRestore(versionId: string) {
    if (!currentUser || !canEdit) {
      return;
    }

    setRestoringId(versionId);
    setError(null);

    try {
      const response = await apiFetch(
        `/api/documents/${documentId}/versions/${versionId}/restore`,
        {
          method: "POST",
          userId: currentUser.id,
        },
      );

      if (!response.ok) {
        throw new Error(
          await readApiError(response, "Failed to restore version."),
        );
      }

      const payload = (await response.json()) as {
        title: string;
        content: string;
        updatedAt: string;
      };

      onRestored(payload);
      onClose();
    } catch (restoreError) {
      setError(
        restoreError instanceof Error
          ? restoreError.message
          : "Failed to restore version.",
      );
    } finally {
      setRestoringId(null);
    }
  }

  if (!open) {
    return null;
  }

  return (
    <dialog
      open
      className="fixed top-1/2 left-1/2 z-50 m-0 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border/80 bg-card p-0 text-foreground shadow-[0_24px_60px_oklch(0.35_0.04_230/0.2)] backdrop:bg-ink/30"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="space-y-4 p-5">
        <div className="flex items-start gap-3">
          <span
            className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-mist text-ink/70"
            aria-hidden
          >
            <History className="size-4" />
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <h2 className="font-display text-lg font-semibold tracking-tight text-ink">
              Version history
            </h2>
            <p className="text-sm text-muted-foreground">
              Use <span className="font-medium text-foreground">Save version</span>{" "}
              in the editor to create a checkpoint. Restore loads that snapshot.
            </p>
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading versions…</p>
        ) : versions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No versions yet. Click <span className="font-medium">Save version</span>{" "}
            when you want a checkpoint.
          </p>
        ) : (
          <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {versions.map((version) => (
              <li
                key={version.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border/70 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {version.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(version.createdAt).toLocaleString()} ·{" "}
                    {version.createdByName}
                  </p>
                </div>
                {canEdit ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={restoringId !== null}
                    onClick={() => void handleRestore(version.id)}
                  >
                    {restoringId === version.id ? "Restoring…" : "Restore"}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {error ? <ErrorMessage>{error}</ErrorMessage> : null}

        <div className="flex justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </dialog>
  );
}
