import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";

import { BrandMark } from "@/components/brand-mark";
import { DocumentEditor } from "@/components/document-editor";
import { buttonVariants } from "@/components/ui/button";
import { getDocumentAccess } from "@/lib/document-access";
import { EMPTY_DOCUMENT_HTML } from "@/lib/documents";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/request-user";
import { cn } from "@/lib/utils";

type DocumentPageProps = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export default async function DocumentPage({ params }: DocumentPageProps) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/");
  }

  const { id } = await params;

  const document = await prisma.document.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      content: true,
      ownerId: true,
      updatedAt: true,
      owner: { select: { name: true } },
    },
  });

  if (!document) {
    notFound();
  }

  const access = await getDocumentAccess(document.id, user.id);

  if (access === "none") {
    return <DocumentAccessDenied />;
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-6 sm:gap-8 sm:py-10">
      <header className="animate-app-fade-in flex items-center justify-between gap-4">
        <BrandMark href="/dashboard" />
        <Link
          href="/dashboard"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "gap-1.5",
          )}
        >
          <ArrowLeft className="size-4" aria-hidden />
          Documents
        </Link>
      </header>

      <div className="animate-app-fade-up animate-app-delay-1">
        <DocumentEditor
          documentId={document.id}
          initialTitle={document.title}
          initialContent={document.content || EMPTY_DOCUMENT_HTML}
          initialUpdatedAt={document.updatedAt.toISOString()}
          ownerId={document.ownerId}
          ownerName={document.owner.name}
          canEdit={access === "edit"}
        />
      </div>
    </main>
  );
}

function DocumentAccessDenied() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-8 px-6 py-16 text-center">
      <BrandMark href="/dashboard" />
      <div className="animate-app-fade-up space-y-3">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
          You don’t have access
        </h1>
        <p className="text-base leading-relaxed text-muted-foreground">
          This document is private. Ask the owner to share it, or switch to a
          user who already has access.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Link href="/dashboard" className={cn(buttonVariants())}>
          All documents
        </Link>
        <Link href="/" className={cn(buttonVariants({ variant: "outline" }))}>
          Switch user
        </Link>
      </div>
    </main>
  );
}
