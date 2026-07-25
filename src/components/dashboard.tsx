"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type ReactNode } from "react";
import { Plus } from "lucide-react";

import { BrandMark } from "@/components/brand-mark";
import {
  DocumentTable,
  type DashboardDocument,
} from "@/components/document-table";
import { ErrorMessage } from "@/components/error-message";
import { FileImport } from "@/components/file-import";
import { Button, buttonVariants } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/use-current-user";
import { apiFetch } from "@/lib/api-client";
import { readApiError } from "@/lib/api-error";
import { cn } from "@/lib/utils";

type DocumentsResponse = {
  owned: DashboardDocument[];
  shared: DashboardDocument[];
};

type DocumentsTab = "owned" | "shared";

export function Dashboard() {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const [ownedDocuments, setOwnedDocuments] = useState<DashboardDocument[]>([]);
  const [sharedDocuments, setSharedDocuments] = useState<DashboardDocument[]>(
    [],
  );
  const [activeTab, setActiveTab] = useState<DocumentsTab>("owned");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, startCreateTransition] = useTransition();

  const currentUserId = currentUser?.id ?? null;

  useEffect(() => {
    if (currentUserId === null) {
      router.replace("/");
    }
  }, [currentUserId, router]);

  useEffect(() => {
    if (currentUserId === null) {
      return;
    }

    const userId = currentUserId;
    let cancelled = false;

    async function loadDocuments() {
      setIsLoading(true);
      setLoadError(null);

      try {
        const response = await apiFetch("/api/documents", {
          userId,
        });

        if (!response.ok) {
          throw new Error(
            await readApiError(response, "Failed to load documents."),
          );
        }

        const data = (await response.json()) as DocumentsResponse;

        if (!cancelled) {
          setOwnedDocuments(data.owned);
          setSharedDocuments(data.shared);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error ? error.message : "Failed to load documents.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadDocuments();

    return () => {
      cancelled = true;
    };
  }, [currentUserId]);

  function handleCreateDocument() {
    if (currentUser === null || isCreating) {
      return;
    }

    setActionError(null);

    startCreateTransition(async () => {
      try {
        const response = await apiFetch("/api/documents", {
          method: "POST",
          userId: currentUser.id,
        });

        if (!response.ok) {
          throw new Error(
            await readApiError(response, "Failed to create document."),
          );
        }

        const document = (await response.json()) as { id: string };
        router.push(`/documents/${document.id}`);
      } catch (error) {
        setActionError(
          error instanceof Error ? error.message : "Failed to create document.",
        );
      }
    });
  }

  async function handleImportDocument(payload: {
    title: string;
    content: string;
  }) {
    if (currentUser === null) {
      throw new Error("Select a demo user before importing.");
    }

    setActionError(null);

    const response = await apiFetch("/api/documents", {
      method: "POST",
      userId: currentUser.id,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(
        await readApiError(response, "Failed to import document."),
      );
    }

    const document = (await response.json()) as { id: string };
    router.push(`/documents/${document.id}`);
  }

  async function handleRenameDocument(documentId: string, title: string) {
    if (currentUser === null) {
      throw new Error("Select a demo user before renaming.");
    }

    const response = await apiFetch(`/api/documents/${documentId}`, {
      method: "PATCH",
      userId: currentUser.id,
      body: JSON.stringify({ title }),
    });

    if (!response.ok) {
      throw new Error(
        await readApiError(response, "Failed to rename document."),
      );
    }

    const updated = (await response.json()) as {
      id: string;
      title: string;
      updatedAt: string;
    };

    const applyRename = (docs: DashboardDocument[]) =>
      docs.map((document) =>
        document.id === updated.id
          ? {
              ...document,
              title: updated.title,
              updatedAt: updated.updatedAt,
            }
          : document,
      );

    setOwnedDocuments(applyRename);
    setSharedDocuments(applyRename);
  }

  if (currentUser === null) {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <p className="text-sm text-muted-foreground">Opening your workspace…</p>
      </main>
    );
  }

  const documents =
    activeTab === "owned" ? ownedDocuments : sharedDocuments;
  const showEmptyCreate =
    activeTab === "owned" && !isLoading && documents.length === 0 && !loadError;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-8 sm:py-12">
      <header className="animate-app-fade-in flex flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <BrandMark href="/dashboard" />
          <div className="flex items-center gap-2">
            <span className="hidden rounded-full bg-mist px-3 py-1 text-sm font-medium text-ink sm:inline">
              {currentUser.name}
            </span>
            <Link
              href="/"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
            >
              Switch user
            </Link>
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-sm text-muted-foreground sm:hidden">
            Signed in as {currentUser.name}
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Hi, {currentUser.name}
          </h1>
          <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
            Create, import, rename, and open documents from one place.
          </p>
        </div>
      </header>

      <section
        className="animate-app-fade-up animate-app-delay-1 overflow-hidden rounded-2xl border border-border/80 bg-card/90 shadow-[0_8px_24px_oklch(0.4_0.04_230/0.04)]"
        aria-labelledby="documents-heading"
      >
        <div className="flex flex-col gap-4 border-b border-border/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="space-y-3">
            <h2
              id="documents-heading"
              className="font-display text-xl font-semibold tracking-tight text-ink"
            >
              Documents
            </h2>
            <div
              className="inline-flex rounded-xl bg-mist/80 p-1"
              role="tablist"
              aria-label="Document lists"
            >
              <TabButton
                selected={activeTab === "owned"}
                onClick={() => setActiveTab("owned")}
                count={isLoading ? null : ownedDocuments.length}
              >
                Owned by me
              </TabButton>
              <TabButton
                selected={activeTab === "shared"}
                onClick={() => setActiveTab("shared")}
                count={isLoading ? null : sharedDocuments.length}
              >
                Shared with me
              </TabButton>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <FileImport
              disabled={isCreating}
              onImport={handleImportDocument}
              onError={setActionError}
            />
            <Button
              type="button"
              size="lg"
              className="h-10"
              onClick={handleCreateDocument}
              disabled={isCreating}
            >
              <Plus data-icon="inline-start" />
              {isCreating ? "Creating…" : "New document"}
            </Button>
          </div>
        </div>

        <div className="px-4 pt-3 sm:px-5">
          <p className="text-xs text-muted-foreground">
            Import .txt, .md, or .docx · up to 5 MB
          </p>
        </div>

        {(actionError || loadError) && (
          <div className="space-y-2 px-4 pt-3 sm:px-5">
            {actionError ? <ErrorMessage>{actionError}</ErrorMessage> : null}
            {loadError ? <ErrorMessage>{loadError}</ErrorMessage> : null}
          </div>
        )}

        <div role="tabpanel" className="pt-1">
          <DocumentTable
            documents={documents}
            showOwner={activeTab === "shared"}
            allowShare={activeTab === "owned"}
            onRename={handleRenameDocument}
            emptyMessage={
              isLoading
                ? "Loading documents…"
                : activeTab === "owned"
                  ? "No documents yet. Create one or import a file."
                  : "Nothing shared with you yet."
            }
            emptyAction={
              showEmptyCreate ? (
                <Button
                  type="button"
                  onClick={handleCreateDocument}
                  disabled={isCreating}
                >
                  {isCreating ? "Creating…" : "Create your first document"}
                </Button>
              ) : null
            }
          />
        </div>
      </section>
    </main>
  );
}

function TabButton({
  selected,
  onClick,
  count,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  count: number | null;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        selected
          ? "bg-card text-ink shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
      {count !== null ? (
        <span
          className={cn(
            "rounded-md px-1.5 py-0.5 text-xs tabular-nums",
            selected ? "bg-mist text-ink" : "bg-transparent text-muted-foreground",
          )}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}
