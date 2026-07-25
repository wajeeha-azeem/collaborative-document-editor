"use client";

import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import {
  useEffect,
  useReducer,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import { Check, History, LoaderCircle, Save, Share2 } from "lucide-react";

import { DocumentExportMenu } from "@/components/document-export-menu";
import { DocumentShareDialog } from "@/components/document-share-dialog";
import { DocumentVersionHistory } from "@/components/document-version-history";
import { EditorToolbar } from "@/components/editor-toolbar";
import { ErrorMessage } from "@/components/error-message";
import { Button } from "@/components/ui/button";
import { WithTooltip } from "@/components/with-tooltip";
import { useCurrentUser } from "@/hooks/use-current-user";
import { apiFetch } from "@/lib/api-client";
import { readApiError } from "@/lib/api-error";
import {
  EMPTY_DOCUMENT_HTML,
  normalizeDocumentTitle,
  validateDocumentContent,
} from "@/lib/documents";
import { openExclusiveOverlay } from "@/lib/exclusive-overlay";
import { cn } from "@/lib/utils";

const SAVE_DEBOUNCE_MS = 700;

type SaveState = "idle" | "saving" | "saved" | "error";

type PendingSave = {
  title?: string;
  content?: string;
};

type DocumentEditorProps = {
  documentId: string;
  initialTitle: string;
  initialContent?: string;
  initialUpdatedAt: string;
  ownerId: string;
  ownerName: string;
  canEdit: boolean;
};

export function DocumentEditor({
  documentId,
  initialTitle,
  initialContent = EMPTY_DOCUMENT_HTML,
  initialUpdatedAt,
  ownerId,
  ownerName,
  canEdit,
}: DocumentEditorProps) {
  const currentUser = useCurrentUser();
  const [, rerender] = useReducer((count: number) => count + 1, 0);
  const [title, setTitle] = useState(initialTitle);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [isSavingVersion, setIsSavingVersion] = useState(false);
  const [versionMessage, setVersionMessage] = useState<string | null>(null);

  function applyExclusiveOverlay(target: "download" | "history" | "share") {
    const next = openExclusiveOverlay(target);
    setDownloadOpen(next.downloadOpen);
    setHistoryOpen(next.historyOpen);
    setShareOpen(next.shareOpen);
  }

  function openDownloadMenu() {
    applyExclusiveOverlay("download");
  }

  function openHistoryModal() {
    applyExclusiveOverlay("history");
  }

  function openShareModal() {
    applyExclusiveOverlay("share");
  }

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSaveRef = useRef<PendingSave | null>(null);
  const isSavingRef = useRef(false);
  const latestTitleRef = useRef(initialTitle);
  const updatedAtRef = useRef(initialUpdatedAt);
  const currentUserIdRef = useRef<string | null>(currentUser?.id ?? null);
  const skipNextContentSaveRef = useRef(true);
  const editorRef = useRef<Editor | null>(null);
  const canEditRef = useRef(canEdit);

  const isOwner = currentUser?.id === ownerId;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2],
        },
      }),
      Underline,
      Placeholder.configure({
        placeholder: canEdit ? "Start writing…" : "View-only document",
      }),
    ],
    content: initialContent.trim() ? initialContent : EMPTY_DOCUMENT_HTML,
    editable: canEdit,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "document-editor__content",
        "aria-label": "Document content",
      },
    },
  });

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  useEffect(() => {
    currentUserIdRef.current = currentUser?.id ?? null;
  }, [currentUser?.id]);

  useEffect(() => {
    canEditRef.current = canEdit;
    editor?.setEditable(canEdit);
  }, [editor, canEdit]);

  useEffect(() => {
    latestTitleRef.current = title;
  }, [title]);

  useEffect(() => {
    function flushSaveQueue(options?: { keepalive?: boolean }) {
      if (!canEditRef.current) {
        return;
      }

      const hadDebounceTimer = Boolean(saveTimerRef.current);

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }

      // Capture in-progress edits that haven't hit pending yet (debounce window).
      if (hadDebounceTimer || pendingSaveRef.current) {
        pendingSaveRef.current = {
          ...pendingSaveRef.current,
          title: latestTitleRef.current,
          ...(editorRef.current
            ? { content: editorRef.current.getHTML() }
            : {}),
        };
      }

      if (!pendingSaveRef.current) {
        return;
      }

      void runSaveQueue({
        documentId,
        pendingSaveRef,
        isSavingRef,
        updatedAtRef,
        latestTitleRef,
        currentUserIdRef,
        editorRef,
        skipNextContentSaveRef,
        keepalive: options?.keepalive ?? false,
        setTitle,
        setSaveState,
        setSaveError,
      });
    }

    function handlePageLeave() {
      flushSaveQueue({ keepalive: true });
    }

    window.addEventListener("pagehide", handlePageLeave);
    window.addEventListener("beforeunload", handlePageLeave);

    return () => {
      window.removeEventListener("pagehide", handlePageLeave);
      window.removeEventListener("beforeunload", handlePageLeave);
      // Next.js client navigations (e.g. back to dashboard) unmount the editor.
      flushSaveQueue({ keepalive: true });
    };
  }, [documentId]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const handleSelection = () => {
      rerender();
    };

    const handleContentUpdate = () => {
      rerender();

      if (skipNextContentSaveRef.current) {
        skipNextContentSaveRef.current = false;
        return;
      }

      if (!canEditRef.current) {
        return;
      }

      if (!currentUserIdRef.current) {
        setSaveState("error");
        setSaveError("Select a demo user before editing.");
        return;
      }

      const html = editor.getHTML();
      const contentError = validateDocumentContent(html);

      if (contentError) {
        setSaveState("error");
        setSaveError(contentError);
        return;
      }

      queueSave(
        { content: html },
        {
          documentId,
          pendingSaveRef,
          saveTimerRef,
          isSavingRef,
          updatedAtRef,
          latestTitleRef,
          currentUserIdRef,
          editorRef,
          skipNextContentSaveRef,
          setTitle,
          setSaveState,
          setSaveError,
        },
      );
    };

    editor.on("selectionUpdate", handleSelection);
    editor.on("update", handleContentUpdate);

    return () => {
      editor.off("selectionUpdate", handleSelection);
      editor.off("update", handleContentUpdate);
    };
  }, [editor, documentId]);

  function handleTitleChange(value: string) {
    if (!canEdit) {
      return;
    }

    setTitle(value);

    if (!currentUserIdRef.current) {
      setSaveState("error");
      setSaveError("Select a demo user before editing.");
      return;
    }

    queueSave(
      { title: value },
      {
        documentId,
        pendingSaveRef,
        saveTimerRef,
        isSavingRef,
        updatedAtRef,
        latestTitleRef,
        currentUserIdRef,
        editorRef,
        skipNextContentSaveRef,
        setTitle,
        setSaveState,
        setSaveError,
      },
    );
  }

  function handleTitleBlur() {
    if (!canEdit) {
      return;
    }

    const normalized = normalizeDocumentTitle(title);

    if (!normalized) {
      setTitle(latestTitleRef.current);
      setSaveError("Title cannot be empty.");
      setSaveState("error");
      return;
    }

    if (normalized !== title) {
      setTitle(normalized);
    }
  }

  function handleVersionRestored(payload: {
    title: string;
    content: string;
    updatedAt: string;
  }) {
    setTitle(payload.title);
    latestTitleRef.current = payload.title;
    updatedAtRef.current = payload.updatedAt;
    skipNextContentSaveRef.current = true;
    editor?.commands.setContent(payload.content, { emitUpdate: false });
    setSaveState("saved");
    setSaveError(null);
    setVersionMessage("Restored version.");
  }

  async function handleSaveVersion() {
    if (!canEdit || !currentUser || isSavingVersion) {
      return;
    }

    setVersionMessage(null);
    setIsSavingVersion(true);

    try {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }

      if (editor) {
        pendingSaveRef.current = {
          ...pendingSaveRef.current,
          title,
          content: editor.getHTML(),
        };
      }

      await runSaveQueue({
        documentId,
        pendingSaveRef,
        isSavingRef,
        updatedAtRef,
        latestTitleRef,
        currentUserIdRef,
        editorRef,
        skipNextContentSaveRef,
        setTitle,
        setSaveState: (value) => {
          setSaveState((current) => {
            const next = typeof value === "function" ? value(current) : value;
            // Keep the status chip stable so toolbar icons don't jump.
            return next === "saving" ? current : next;
          });
        },
        setSaveError,
      });

      const response = await apiFetch(`/api/documents/${documentId}/versions`, {
        method: "POST",
        userId: currentUser.id,
      });

      if (!response.ok) {
        throw new Error(
          await readApiError(response, "Failed to save version."),
        );
      }

      setVersionMessage("Version saved.");
      openHistoryModal();
    } catch (error) {
      setSaveState("error");
      setSaveError(
        error instanceof Error ? error.message : "Failed to save version.",
      );
    } finally {
      setIsSavingVersion(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2 print:space-y-3">
        <div className="flex items-start gap-2 sm:gap-3">
          <label className="sr-only" htmlFor="document-title">
            Document title
          </label>
          <input
            id="document-title"
            value={title}
            readOnly={!canEdit}
            onChange={(event) => handleTitleChange(event.target.value)}
            onBlur={handleTitleBlur}
            aria-invalid={saveState === "error" && Boolean(saveError)}
            aria-describedby={
              saveState === "error" && saveError
                ? "document-save-error"
                : "document-meta"
            }
            className="font-display min-w-0 flex-1 rounded-xl border border-transparent bg-transparent px-1 py-1 text-3xl font-semibold tracking-tight text-ink outline-none transition-colors placeholder:text-muted-foreground/50 hover:border-border/60 focus:border-ring focus:ring-3 focus:ring-ring/40 aria-invalid:border-destructive aria-invalid:focus:ring-destructive/20 read-only:hover:border-transparent read-only:focus:border-transparent read-only:focus:ring-0 sm:text-4xl"
            placeholder="Untitled document"
          />

          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1 pt-1.5 sm:pt-2 print:hidden">
            {!canEdit ? (
              <span className="mr-1 inline-flex items-center rounded-full border border-border/70 bg-mist px-2.5 py-1 text-xs font-medium text-ink">
                View only
              </span>
            ) : null}
            {canEdit && saveState !== "error" ? (
              <SaveStatus
                state={
                  isSavingVersion && saveState === "saving"
                    ? "saved"
                    : saveState
                }
              />
            ) : null}
            {canEdit ? (
              <WithTooltip
                label={isSavingVersion ? "Saving version…" : "Save version"}
              >
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-9"
                  aria-label="Save version"
                  disabled={isSavingVersion}
                  onClick={() => void handleSaveVersion()}
                >
                  {isSavingVersion ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                </Button>
              </WithTooltip>
            ) : null}
            <DocumentExportMenu
              title={title}
              getHtml={() => editor?.getHTML() ?? initialContent}
              open={downloadOpen}
              onOpenChange={(next) => {
                if (next) {
                  openDownloadMenu();
                } else {
                  setDownloadOpen(false);
                }
              }}
            />
            {canEdit ? (
              <WithTooltip label="Version history">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Version history"
                  className="size-9"
                  onClick={openHistoryModal}
                >
                  <History />
                </Button>
              </WithTooltip>
            ) : null}
            {isOwner ? (
              <WithTooltip label="Share">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Share document"
                  className="size-9"
                  onClick={openShareModal}
                >
                  <Share2 />
                </Button>
              </WithTooltip>
            ) : null}
          </div>
        </div>

        <p id="document-meta" className="px-1 text-sm text-muted-foreground">
          Owned by {ownerName}
          {!isOwner ? " · Shared with you" : null}
          {versionMessage ? ` · ${versionMessage}` : null}
        </p>

        {saveState === "error" && saveError ? (
          <ErrorMessage id="document-save-error">{saveError}</ErrorMessage>
        ) : null}
      </div>

      <div className="document-editor overflow-hidden rounded-2xl border border-border/80 print:border-0 print:shadow-none">
        {canEdit ? (
          <div className="sticky top-0 z-10 print:hidden">
            <EditorToolbar editor={editor} />
          </div>
        ) : null}
        <EditorContent editor={editor} />
      </div>

      {isOwner ? (
        <DocumentShareDialog
          documentId={documentId}
          documentTitle={title}
          open={shareOpen}
          onClose={() => setShareOpen(false)}
        />
      ) : null}

      {canEdit ? (
        <DocumentVersionHistory
          documentId={documentId}
          canEdit={canEdit}
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          onRestored={handleVersionRestored}
        />
      ) : null}
    </div>
  );
}

function SaveStatus({ state }: { state: SaveState }) {
  if (state === "idle") {
    return null;
  }

  return (
    <p
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        state === "saving" && "bg-mist text-muted-foreground",
        state === "saved" &&
          "bg-[oklch(0.93_0.04_160)] text-[oklch(0.35_0.06_160)]",
      )}
      aria-live="polite"
    >
      {state === "saving" ? (
        <>
          <LoaderCircle className="size-3.5 animate-spin" aria-hidden />
          Saving…
        </>
      ) : (
        <>
          <Check className="size-3.5" aria-hidden />
          Saved
        </>
      )}
    </p>
  );
}

type SaveController = {
  documentId: string;
  pendingSaveRef: MutableRefObject<PendingSave | null>;
  saveTimerRef?: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  isSavingRef: MutableRefObject<boolean>;
  updatedAtRef: MutableRefObject<string>;
  latestTitleRef: MutableRefObject<string>;
  currentUserIdRef: MutableRefObject<string | null>;
  editorRef: MutableRefObject<Editor | null>;
  skipNextContentSaveRef: MutableRefObject<boolean>;
  setTitle: Dispatch<SetStateAction<string>>;
  setSaveState: Dispatch<SetStateAction<SaveState>>;
  setSaveError: Dispatch<SetStateAction<string | null>>;
  keepalive?: boolean;
};

function queueSave(partial: PendingSave, controller: SaveController) {
  controller.pendingSaveRef.current = {
    ...controller.pendingSaveRef.current,
    ...partial,
  };
  controller.setSaveState("saving");
  controller.setSaveError(null);

  if (controller.saveTimerRef?.current) {
    clearTimeout(controller.saveTimerRef.current);
  }

  if (!controller.saveTimerRef) {
    void runSaveQueue(controller);
    return;
  }

  controller.saveTimerRef.current = setTimeout(() => {
    if (controller.saveTimerRef) {
      controller.saveTimerRef.current = null;
    }
    void runSaveQueue(controller);
  }, SAVE_DEBOUNCE_MS);
}

async function runSaveQueue(controller: SaveController) {
  const {
    documentId,
    pendingSaveRef,
    isSavingRef,
    updatedAtRef,
    latestTitleRef,
    currentUserIdRef,
    editorRef,
    skipNextContentSaveRef,
    setTitle,
    setSaveState,
    setSaveError,
    keepalive = false,
  } = controller;

  if (isSavingRef.current) {
    return;
  }

  const userId = currentUserIdRef.current;
  const pending = pendingSaveRef.current;

  if (!userId || !pending) {
    return;
  }

  const body: {
    title?: string;
    content?: string;
    expectedUpdatedAt: string;
  } = {
    expectedUpdatedAt: updatedAtRef.current,
  };

  if (pending.title !== undefined) {
    const normalized = normalizeDocumentTitle(pending.title);

    if (!normalized) {
      const remaining: PendingSave = { ...pending, title: undefined };
      pendingSaveRef.current =
        remaining.content !== undefined ? { content: remaining.content } : null;
      setSaveState("error");
      setSaveError("Title cannot be empty.");
      return;
    }

    body.title = normalized;
  }

  if (pending.content !== undefined) {
    const contentError = validateDocumentContent(pending.content);

    if (contentError) {
      setSaveState("error");
      setSaveError(contentError);
      return;
    }

    body.content = pending.content;
  }

  if (body.title === undefined && body.content === undefined) {
    pendingSaveRef.current = null;
    return;
  }

  pendingSaveRef.current = null;
  isSavingRef.current = true;
  setSaveState("saving");
  setSaveError(null);

  try {
    const response = await apiFetch(`/api/documents/${documentId}`, {
      method: "PATCH",
      userId,
      body: JSON.stringify(body),
      keepalive,
    });

    if (response.status === 409) {
      const conflict = (await response.json()) as {
        title?: string;
        content?: string;
        updatedAt?: string;
        error?: string;
      };

      if (typeof conflict.updatedAt === "string") {
        updatedAtRef.current = conflict.updatedAt;
      }

      if (typeof conflict.title === "string") {
        setTitle(conflict.title);
        latestTitleRef.current = conflict.title;
      }

      if (typeof conflict.content === "string" && editorRef.current) {
        skipNextContentSaveRef.current = true;
        editorRef.current.commands.setContent(conflict.content, {
          emitUpdate: false,
        });
      }

      setSaveState("error");
      setSaveError(
        typeof conflict.error === "string"
          ? conflict.error
          : "This document was updated elsewhere. Loaded the latest version.",
      );
      return;
    }

    if (!response.ok) {
      pendingSaveRef.current = {
        ...pending,
        ...(pendingSaveRef.current ?? {}),
      };
      setSaveState("error");
      setSaveError(await readApiError(response, "Failed to save document."));
      return;
    }

    const payload = (await response.json()) as {
      title: string;
      content: string;
      updatedAt: string;
    };

    updatedAtRef.current = payload.updatedAt;
    setTitle(payload.title);
    latestTitleRef.current = payload.title;
    setSaveState("saved");
  } catch {
    pendingSaveRef.current = {
      ...pending,
      ...(pendingSaveRef.current ?? {}),
    };
    setSaveState("error");
    setSaveError(
      "Couldn’t save right now. Check your connection and try editing again.",
    );
  } finally {
    isSavingRef.current = false;

    if (pendingSaveRef.current) {
      void runSaveQueue(controller);
    }
  }
}
