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
import { Check, LoaderCircle, Share2 } from "lucide-react";

import { DocumentExportMenu } from "@/components/document-export-menu";
import { DocumentShareDialog } from "@/components/document-share-dialog";
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
};

export function DocumentEditor({
  documentId,
  initialTitle,
  initialContent = EMPTY_DOCUMENT_HTML,
  initialUpdatedAt,
  ownerId,
  ownerName,
}: DocumentEditorProps) {
  const currentUser = useCurrentUser();
  const [, rerender] = useReducer((count: number) => count + 1, 0);
  const [title, setTitle] = useState(initialTitle);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);

  function openDownloadMenu() {
    const next = openExclusiveOverlay("download");
    setDownloadOpen(next.downloadOpen);
    setShareOpen(next.shareOpen);
  }

  function openShareModal() {
    const next = openExclusiveOverlay("share");
    setDownloadOpen(next.downloadOpen);
    setShareOpen(next.shareOpen);
  }

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSaveRef = useRef<PendingSave | null>(null);
  const isSavingRef = useRef(false);
  const latestTitleRef = useRef(initialTitle);
  const updatedAtRef = useRef(initialUpdatedAt);
  const currentUserIdRef = useRef<string | null>(currentUser?.id ?? null);
  const skipNextContentSaveRef = useRef(true);
  const editorRef = useRef<Editor | null>(null);

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
        placeholder: "Start writing…",
      }),
    ],
    content: initialContent.trim() ? initialContent : EMPTY_DOCUMENT_HTML,
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
    latestTitleRef.current = title;
  }, [title]);

  useEffect(() => {
    async function flushSaveQueue(options?: { keepalive?: boolean }) {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
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
        keepalive: options?.keepalive ?? false,
        setTitle,
        setSaveState,
        setSaveError,
      });
    }

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (!pendingSaveRef.current && !isSavingRef.current) {
        return;
      }

      void flushSaveQueue({ keepalive: true });
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      void flushSaveQueue({ keepalive: true });
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
            onChange={(event) => handleTitleChange(event.target.value)}
            onBlur={handleTitleBlur}
            aria-invalid={saveState === "error" && Boolean(saveError)}
            aria-describedby={
              saveState === "error" && saveError
                ? "document-save-error"
                : "document-meta"
            }
            className="font-display min-w-0 flex-1 rounded-xl border border-transparent bg-transparent px-1 py-1 text-3xl font-semibold tracking-tight text-ink outline-none transition-colors placeholder:text-muted-foreground/50 hover:border-border/60 focus:border-ring focus:ring-3 focus:ring-ring/40 aria-invalid:border-destructive aria-invalid:focus:ring-destructive/20 sm:text-4xl"
            placeholder="Untitled document"
          />

          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1 pt-1.5 sm:pt-2 print:hidden">
            {saveState !== "error" ? <SaveStatus state={saveState} /> : null}
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
          {isOwner ? null : " · Shared with you"}
        </p>

        {saveState === "error" && saveError ? (
          <ErrorMessage id="document-save-error">{saveError}</ErrorMessage>
        ) : null}
      </div>

      <div className="document-editor overflow-hidden rounded-2xl border border-border/80 print:border-0 print:shadow-none">
        <div className="sticky top-0 z-10 print:hidden">
          <EditorToolbar editor={editor} />
        </div>
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
