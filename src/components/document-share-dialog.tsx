"use client";

import { useEffect, useRef } from "react";
import { UserPlus, X } from "lucide-react";

import { DocumentShareForm } from "@/components/document-share-form";
import { Button } from "@/components/ui/button";
import { WithTooltip } from "@/components/with-tooltip";

type DocumentShareDialogProps = {
  documentId: string;
  documentTitle: string;
  open: boolean;
  onClose: () => void;
};

export function DocumentShareDialog({
  documentId,
  documentTitle,
  open,
  onClose,
}: DocumentShareDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <dialog
      ref={dialogRef}
      className="fixed top-1/2 left-1/2 z-50 m-0 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border/80 bg-card p-0 text-foreground shadow-[0_24px_60px_oklch(0.35_0.04_230/0.2)] backdrop:bg-ink/30"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) {
          onClose();
        }
      }}
    >
      <div className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span
              className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-mist text-ink/70"
              aria-hidden
            >
              <UserPlus className="size-4" />
            </span>
            <div className="space-y-1">
              <h2 className="font-display text-lg font-semibold tracking-tight text-ink">
                Share document
              </h2>
              <p className="text-sm text-muted-foreground">
                Invite someone to{" "}
                <span className="font-medium text-foreground">
                  {documentTitle}
                </span>{" "}
                with view or edit access.
              </p>
            </div>
          </div>
          <WithTooltip label="Close">
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label="Close share dialog"
              onClick={onClose}
            >
              <X />
            </Button>
          </WithTooltip>
        </div>

        <DocumentShareForm
          documentId={documentId}
          selectId={`share-user-${documentId}`}
        />
      </div>
    </dialog>
  );
}
