import { NextResponse } from "next/server";

import { userCanAccessDocument } from "@/lib/document-access";
import { EMPTY_DOCUMENT_HTML } from "@/lib/documents";
import { createDocumentVersion } from "@/lib/document-versions";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/request-user";

type RouteContext = {
  params: Promise<{ id: string; versionId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const result = await requireUserId(request);

  if ("error" in result) {
    return result.error;
  }

  const { id: documentId, versionId } = await context.params;

  const canAccess = await userCanAccessDocument(documentId, result.user.id);

  if (!canAccess) {
    return NextResponse.json(
      { error: "You do not have access to this document." },
      { status: 403 },
    );
  }

  const [document, version] = await Promise.all([
    prisma.document.findUnique({
      where: { id: documentId },
      select: { id: true, title: true, content: true, updatedAt: true },
    }),
    prisma.documentVersion.findFirst({
      where: { id: versionId, documentId },
      select: { id: true, title: true, content: true },
    }),
  ]);

  if (!document) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  if (!version) {
    return NextResponse.json({ error: "Version not found." }, { status: 404 });
  }

  // Keep the current state in history before restoring.
  await createDocumentVersion({
    documentId,
    title: document.title,
    content: document.content || EMPTY_DOCUMENT_HTML,
    createdById: result.user.id,
  });

  const restored = await prisma.document.update({
    where: { id: documentId },
    data: {
      title: version.title,
      content: version.content || EMPTY_DOCUMENT_HTML,
    },
    select: {
      id: true,
      title: true,
      content: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({
    id: restored.id,
    title: restored.title,
    content: restored.content || EMPTY_DOCUMENT_HTML,
    updatedAt: restored.updatedAt.toISOString(),
  });
}
