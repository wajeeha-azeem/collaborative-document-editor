"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

type MenuPosition = {
  top: number;
  right: number;
};

function measureMenuPosition(trigger: HTMLElement): MenuPosition {
  const rect = trigger.getBoundingClientRect();
  return {
    top: rect.bottom + 4,
    right: window.innerWidth - rect.right,
  };
}

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
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : uncontrolledOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      if (next && rootRef.current) {
        setMenuPosition(measureMenuPosition(rootRef.current));
      }
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

    function handleReposition() {
      if (!rootRef.current) {
        return;
      }
      setMenuPosition(measureMenuPosition(rootRef.current));
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        rootRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
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

  const menu =
    typeof document !== "undefined" && open && menuPosition
      ? createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label="Download formats"
            style={{
              top: menuPosition.top,
              right: menuPosition.right,
            }}
            className="fixed z-50 min-w-44 overflow-hidden rounded-xl border border-border/80 bg-card py-1 shadow-[0_12px_30px_oklch(0.35_0.04_230/0.16)]"
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
            {error ? (
              <p className="border-t border-border/60 px-3 py-2 text-xs text-destructive">
                {error}
              </p>
            ) : null}
          </div>,
          document.body,
        )
      : null;

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
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
        </Button>
      </WithTooltip>
      {menu}
    </div>
  );
}
