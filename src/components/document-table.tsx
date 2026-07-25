"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ArrowRight, Check, Pencil, Share2, X } from "lucide-react";

import { DocumentExportMenu } from "@/components/document-export-menu";
import { DocumentShareDialog } from "@/components/document-share-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { WithTooltip } from "@/components/with-tooltip";
import { useCurrentUser } from "@/hooks/use-current-user";
import { apiFetch } from "@/lib/api-client";
import { readApiError } from "@/lib/api-error";
import { EMPTY_DOCUMENT_HTML, normalizeDocumentTitle } from "@/lib/documents";
import { cn } from "@/lib/utils";

export type DashboardDocument = {
  id: string;
  title: string;
  updatedAt: string;
  ownerName?: string;
};

type DocumentTableProps = {
  documents: DashboardDocument[];
  emptyMessage: string;
  emptyAction?: ReactNode;
  showOwner?: boolean;
  allowShare?: boolean;
  onRename: (documentId: string, title: string) => Promise<void>;
};

export function DocumentTable({
  documents,
  emptyMessage,
  emptyAction,
  showOwner = false,
  allowShare = false,
  onRename,
}: DocumentTableProps) {
  const currentUser = useCurrentUser();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [sharingDocument, setSharingDocument] =
    useState<DashboardDocument | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editingId]);


  async function loadDocumentHtml(documentId: string) {
    if (!currentUser) {
      throw new Error("Select a demo user before downloading.");
    }

    const response = await apiFetch(`/api/documents/${documentId}`, {
      userId: currentUser.id,
    });

    if (!response.ok) {
      throw new Error(
        await readApiError(response, "Failed to load document for download."),
      );
    }

    const data = (await response.json()) as { content?: string };
    return data.content?.trim() ? data.content : EMPTY_DOCUMENT_HTML;
  }

  function startRename(document: DashboardDocument) {
    setEditingId(document.id);
    setDraftTitle(document.title);
    setRenameError(null);
  }

  function cancelRename() {
    setEditingId(null);
    setDraftTitle("");
    setRenameError(null);
    setIsSaving(false);
  }

  async function saveRename(documentId: string) {
    const title = normalizeDocumentTitle(draftTitle);

    if (!title) {
      setRenameError("Title cannot be empty.");
      return;
    }

    setIsSaving(true);
    setRenameError(null);

    try {
      await onRename(documentId, title);
      cancelRename();
    } catch (error) {
      setRenameError(
        error instanceof Error ? error.message : "Failed to rename document.",
      );
      setIsSaving(false);
    }
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 px-5 py-14 text-center">
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
          {emptyMessage}
        </p>
        {emptyAction}
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border/70 text-xs tracking-wide text-muted-foreground uppercase">
              <th className="px-4 py-3 font-semibold sm:px-5">Name</th>
              {showOwner ? (
                <th className="px-4 py-3 font-semibold sm:px-5">Owner</th>
              ) : null}
              <th className="px-4 py-3 font-semibold sm:px-5">Last edited</th>
              <th className="px-4 py-3 text-right font-semibold sm:px-5">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {documents.map((document) => {
              const isEditing = editingId === document.id;

              return (
                <tr
                  key={document.id}
                  className="border-b border-border/50 last:border-b-0 hover:bg-accent/30"
                >
                  <td className="px-4 py-3 align-middle sm:px-5">
                    {isEditing ? (
                      <div className="space-y-1.5">
                        <input
                          ref={inputRef}
                          value={draftTitle}
                          disabled={isSaving}
                          onChange={(event) =>
                            setDraftTitle(event.target.value)
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              void saveRename(document.id);
                            }
                            if (event.key === "Escape") {
                              event.preventDefault();
                              cancelRename();
                            }
                          }}
                          aria-label="Document title"
                          aria-invalid={renameError ? true : undefined}
                          className="h-9 w-full max-w-md rounded-lg border border-border bg-background px-2.5 text-sm font-medium outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
                        />
                        {renameError ? (
                          <p className="text-xs text-destructive" role="alert">
                            {renameError}
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <Link
                        href={`/documents/${document.id}`}
                        className="font-medium text-foreground hover:text-ink hover:underline hover:underline-offset-2"
                      >
                        {document.title}
                      </Link>
                    )}
                  </td>
                  {showOwner ? (
                    <td className="px-4 py-3 align-middle text-muted-foreground sm:px-5">
                      {document.ownerName ?? "—"}
                    </td>
                  ) : null}
                  <td className="px-4 py-3 align-middle whitespace-nowrap text-muted-foreground sm:px-5">
                    <time dateTime={document.updatedAt}>
                      {formatUpdatedAt(document.updatedAt)}
                    </time>
                  </td>
                  <td className="px-4 py-3 align-middle sm:px-5">
                    <div className="flex items-center justify-end gap-1">
                      {isEditing ? (
                        <>
                          <WithTooltip label="Save">
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="default"
                              aria-label="Save name"
                              disabled={isSaving}
                              onClick={() => void saveRename(document.id)}
                            >
                              <Check />
                            </Button>
                          </WithTooltip>
                          <WithTooltip label="Cancel">
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="ghost"
                              aria-label="Cancel rename"
                              disabled={isSaving}
                              onClick={cancelRename}
                            >
                              <X />
                            </Button>
                          </WithTooltip>
                        </>
                      ) : (
                        <>
                          <WithTooltip label="Rename">
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="ghost"
                              aria-label={`Rename ${document.title}`}
                              onClick={() => startRename(document)}
                            >
                              <Pencil />
                            </Button>
                          </WithTooltip>
                          <DocumentExportMenu
                            title={document.title}
                            buttonSize="icon-sm"
                            getHtml={() => loadDocumentHtml(document.id)}
                          />
                          {allowShare ? (
                            <WithTooltip label="Share">
                              <Button
                                type="button"
                                size="icon-sm"
                                variant="ghost"
                                aria-label={`Share ${document.title}`}
                                onClick={() => setSharingDocument(document)}
                              >
                                <Share2 />
                              </Button>
                            </WithTooltip>
                          ) : null}
                          <WithTooltip label="Open">
                            <Link
                              href={`/documents/${document.id}`}
                              aria-label={`Open ${document.title}`}
                              className={cn(
                                buttonVariants({
                                  variant: "ghost",
                                  size: "icon-sm",
                                }),
                              )}
                            >
                              <ArrowRight />
                            </Link>
                          </WithTooltip>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {sharingDocument ? (
        <DocumentShareDialog
          documentId={sharingDocument.id}
          documentTitle={sharingDocument.title}
          open
          onClose={() => setSharingDocument(null)}
        />
      ) : null}
    </>
  );
}

function formatUpdatedAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const now = Date.now();
  const diffMs = now - date.getTime();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) {
    return "Just now";
  }
  if (diffMs < hour) {
    const mins = Math.max(1, Math.floor(diffMs / minute));
    return `${mins}m ago`;
  }
  if (diffMs < day) {
    const hours = Math.floor(diffMs / hour);
    return `${hours}h ago`;
  }
  if (diffMs < 7 * day) {
    const days = Math.floor(diffMs / day);
    return `${days}d ago`;
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
