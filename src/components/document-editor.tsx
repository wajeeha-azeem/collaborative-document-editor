"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { useEffect, useReducer, useRef, useState } from "react";
import { Check, LoaderCircle, Share2 } from "lucide-react";

import { DocumentShareDialog } from "@/components/document-share-dialog";
import { EditorToolbar } from "@/components/editor-toolbar";
import { ErrorMessage } from "@/components/error-message";
import { Button } from "@/components/ui/button";
import { WithTooltip } from "@/components/with-tooltip";
import { useCurrentUser } from "@/hooks/use-current-user";
import { readApiError } from "@/lib/api-error";
import {
  EMPTY_DOCUMENT_HTML,
  USER_ID_HEADER,
  normalizeDocumentTitle,
} from "@/lib/documents";
import { cn } from "@/lib/utils";

type SaveState = "idle" | "saving" | "saved" | "error";

type DocumentEditorProps = {
  documentId: string;
  initialTitle: string;
  initialContent?: string;
  ownerId: string;
  ownerName: string;
};

export function DocumentEditor({
  documentId,
  initialTitle,
  initialContent = EMPTY_DOCUMENT_HTML,
  ownerId,
  ownerName,
}: DocumentEditorProps) {
  const currentUser = useCurrentUser();
  const [, rerender] = useReducer((count: number) => count + 1, 0);
  const [title, setTitle] = useState(initialTitle);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  const titleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestTitleRef = useRef(initialTitle);
  const skipNextContentSaveRef = useRef(true);

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
    latestTitleRef.current = title;
  }, [title]);

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

      if (!currentUser) {
        setSaveState("error");
        setSaveError("Select a demo user before editing.");
        return;
      }

      if (contentTimerRef.current) {
        clearTimeout(contentTimerRef.current);
      }

      setSaveState("saving");
      setSaveError(null);

      const html = editor.getHTML();
      const userId = currentUser.id;

      contentTimerRef.current = setTimeout(() => {
        void saveDocument({
          documentId,
          userId,
          body: { content: html },
          onError: (message) => {
            setSaveState("error");
            setSaveError(message);
          },
          onSuccess: () => {
            setSaveState("saved");
          },
        });
      }, 700);
    };

    editor.on("selectionUpdate", handleSelection);
    editor.on("update", handleContentUpdate);

    return () => {
      editor.off("selectionUpdate", handleSelection);
      editor.off("update", handleContentUpdate);
    };
  }, [editor, currentUser, documentId]);

  useEffect(() => {
    return () => {
      if (titleTimerRef.current) {
        clearTimeout(titleTimerRef.current);
      }
      if (contentTimerRef.current) {
        clearTimeout(contentTimerRef.current);
      }
    };
  }, []);

  function handleTitleChange(value: string) {
    setTitle(value);

    if (!currentUser) {
      setSaveState("error");
      setSaveError("Select a demo user before editing.");
      return;
    }

    if (titleTimerRef.current) {
      clearTimeout(titleTimerRef.current);
    }

    const userId = currentUser.id;

    titleTimerRef.current = setTimeout(() => {
      const normalized = normalizeDocumentTitle(value);

      if (!normalized) {
        setSaveState("error");
        setSaveError("Title cannot be empty.");
        return;
      }

      setSaveState("saving");
      setSaveError(null);

      void saveDocument({
        documentId,
        userId,
        body: { title: normalized },
        onError: (message) => {
          setSaveState("error");
          setSaveError(message);
        },
        onSuccess: (payload) => {
          setTitle(payload.title);
          latestTitleRef.current = payload.title;
          setSaveState("saved");
        },
      });
    }, 700);
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
      <div className="space-y-2">
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

          <div className="flex shrink-0 items-center gap-1 pt-1.5 sm:pt-2">
            {saveState !== "error" ? <SaveStatus state={saveState} /> : null}
            {isOwner ? (
              <WithTooltip label="Share">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Share document"
                  className="size-9"
                  onClick={() => setShareOpen(true)}
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

      <div className="document-editor overflow-hidden rounded-2xl border border-border/80">
        <div className="sticky top-0 z-10">
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

async function saveDocument({
  documentId,
  userId,
  body,
  onSuccess,
  onError,
}: {
  documentId: string;
  userId: string;
  body: { title?: string; content?: string };
  onSuccess: (payload: { title: string; content: string }) => void;
  onError: (message: string) => void;
}) {
  try {
    const response = await fetch(`/api/documents/${documentId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        [USER_ID_HEADER]: userId,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      onError(await readApiError(response, "Failed to save document."));
      return;
    }

    const payload = (await response.json()) as {
      title: string;
      content: string;
    };
    onSuccess(payload);
  } catch {
    onError(
      "Couldn’t save right now. Check your connection and try editing again.",
    );
  }
}
