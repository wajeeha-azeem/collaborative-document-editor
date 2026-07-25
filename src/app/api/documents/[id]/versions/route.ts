import { NextResponse } from "next/server";

import { userCanAccessDocument } from "@/lib/document-access";
import { EMPTY_DOCUMENT_HTML } from "@/lib/documents";
import { createDocumentVersion } from "@/lib/document-versions";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/request-user";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const result = await requireUserId(request);

  if ("error" in result) {
    return result.error;
  }

  const { id: documentId } = await context.params;

  const canAccess = await userCanAccessDocument(documentId, result.user.id);

  if (!canAccess) {
    return NextResponse.json(
      { error: "You do not have access to this document." },
      { status: 403 },
    );
  }

  const versions = await prisma.documentVersion.findMany({
    where: { documentId },
    orderBy: { createdAt: "desc" },
    take: 40,
    select: {
      id: true,
      title: true,
      createdAt: true,
      createdBy: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({
    versions: versions.map((version) => ({
      id: version.id,
      title: version.title,
      createdAt: version.createdAt.toISOString(),
      createdById: version.createdBy.id,
      createdByName: version.createdBy.name,
    })),
  });
}

export async function POST(request: Request, context: RouteContext) {
  const result = await requireUserId(request);

  if ("error" in result) {
    return result.error;
  }

  const { id: documentId } = await context.params;

  const canAccess = await userCanAccessDocument(documentId, result.user.id);

  if (!canAccess) {
    return NextResponse.json(
      { error: "You do not have access to this document." },
      { status: 403 },
    );
  }

  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: { id: true, title: true, content: true },
  });

  if (!document) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  const created = await createDocumentVersion({
    documentId,
    title: document.title,
    content: document.content || EMPTY_DOCUMENT_HTML,
    createdById: result.user.id,
  });

  if (!created) {
    return NextResponse.json(
      {
        error:
          "Current document already matches the latest saved version. Make a change, then save again.",
      },
      { status: 409 },
    );
  }

  const version = await prisma.documentVersion.findUnique({
    where: { id: created.id },
    select: {
      id: true,
      title: true,
      createdAt: true,
      createdBy: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(
    {
      id: version?.id,
      title: version?.title,
      createdAt: version?.createdAt.toISOString(),
      createdById: version?.createdBy.id,
      createdByName: version?.createdBy.name,
    },
    { status: 201 },
  );
}
