"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, FileDown, FileText, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { WithTooltip } from "@/components/with-tooltip";
import {
  downloadPdfFile,
  downloadTextFile,
  htmlToMarkdown,
  safeDownloadBasename,
} from "@/lib/export-document";
import { cn } from "@/lib/utils";

type DocumentExportMenuProps = {
  title: string;
  /** Sync or async HTML loader (table rows fetch on demand). */
  getHtml: () => string | Promise<string>;
  buttonSize?: "icon" | "icon-sm";
  /** Controlled open state (editor overlays). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function DocumentExportMenu({
  title,
  getHtml,
  buttonSize = "icon",
  open: openProp,
  onOpenChange,
}: DocumentExportMenuProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : uncontrolledOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(next);
      }
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, setOpen]);

  async function resolveHtml() {
    return getHtml();
  }

  async function handleMarkdownExport() {
    setError(null);
    setIsExporting(true);

    try {
      const html = await resolveHtml();
      const markdown = htmlToMarkdown(html);
      const basename = safeDownloadBasename(title);
      downloadTextFile(
        `${basename}.md`,
        `# ${title}\n\n${markdown}\n`,
        "text/markdown;charset=utf-8",
      );
      setOpen(false);
    } catch {
      setError("Couldn’t download Markdown.");
    } finally {
      setIsExporting(false);
    }
  }

  async function handlePdfExport() {
    setError(null);
    setIsExporting(true);

    try {
      const html = await resolveHtml();
      downloadPdfFile(title, html);
      setOpen(false);
    } catch {
      setError("Couldn’t download PDF.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <WithTooltip label="Download">
        <Button
          type="button"
          size={buttonSize}
          variant="ghost"
          className={cn(buttonSize === "icon" && "size-9")}
          aria-label="Download"
          aria-expanded={open}
          aria-haspopup="menu"
          disabled={isExporting}
          onClick={() => setOpen(!open)}
        >
          {isExporting ? (
            <LoaderCircle className="animate-spin" />
          ) : (
            <Download />
          )}
        </Button>
      </WithTooltip>

      {open ? (
        <div
          role="menu"
          aria-label="Download formats"
          className="absolute top-full right-0 z-20 mt-1 min-w-44 overflow-hidden rounded-xl border border-border/80 bg-card py-1 shadow-[0_12px_30px_oklch(0.35_0.04_230/0.16)]"
        >
          <button
            type="button"
            role="menuitem"
            disabled={isExporting}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-mist/80 disabled:opacity-60"
            onClick={() => void handleMarkdownExport()}
          >
            <FileDown className="size-4 text-muted-foreground" aria-hidden />
            Markdown (.md)
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={isExporting}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-mist/80 disabled:opacity-60"
            onClick={() => void handlePdfExport()}
          >
            <FileText className="size-4 text-muted-foreground" aria-hidden />
            PDF (.pdf)
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="absolute top-full right-0 z-20 mt-12 whitespace-nowrap text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
