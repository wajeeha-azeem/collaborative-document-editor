"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { WithTooltip } from "@/components/with-tooltip";
import { importFile } from "@/lib/file-import";

type FileImportProps = {
  disabled?: boolean;
  onImport: (payload: { title: string; content: string }) => Promise<void>;
  onError?: (message: string | null) => void;
};

export function FileImport({
  disabled = false,
  onImport,
  onError,
}: FileImportProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  async function handleFileChange(fileList: FileList | null) {
    const file = fileList?.[0];

    if (!file) {
      return;
    }

    onError?.(null);
    setIsImporting(true);

    try {
      const payload = await importFile(file);
      await onImport(payload);
    } catch (importError) {
      const message =
        importError instanceof Error
          ? importError.message
          : "Failed to import file.";

      if (
        message.includes("Failed to fetch") ||
        message.includes("NetworkError")
      ) {
        onError?.(
          "Upload failed because the network request could not be completed. Check your connection and try again.",
        );
      } else {
        onError?.(message);
      }
    } finally {
      setIsImporting(false);
      resetInput();
    }
  }

  function resetInput() {
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  const isBusy = disabled || isImporting;

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".txt,.md,.docx,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="sr-only"
        disabled={isBusy}
        onChange={(event) => {
          void handleFileChange(event.target.files);
        }}
      />
      <WithTooltip label="Import .txt, .md, or .docx (up to 5 MB)">
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-10"
          disabled={isBusy}
          onClick={() => inputRef.current?.click()}
        >
          <Upload data-icon="inline-start" />
          {isImporting ? "Importing…" : "Import"}
        </Button>
      </WithTooltip>
    </>
  );
}
