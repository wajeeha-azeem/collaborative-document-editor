import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { BrandMark } from "@/components/brand-mark";
import { DocumentEditor } from "@/components/document-editor";
import { buttonVariants } from "@/components/ui/button";
import { EMPTY_DOCUMENT_HTML } from "@/lib/documents";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

type DocumentPageProps = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export default async function DocumentPage({ params }: DocumentPageProps) {
  const { id } = await params;

  const document = await prisma.document.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      content: true,
      ownerId: true,
      owner: { select: { name: true } },
    },
  });

  if (!document) {
    notFound();
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
          ownerId={document.ownerId}
          ownerName={document.owner.name}
        />
      </div>
    </main>
  );
}
