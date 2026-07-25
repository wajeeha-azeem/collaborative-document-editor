import { NextResponse } from "next/server";

import {
  getDocumentAccess,
  userCanEditDocument,
} from "@/lib/document-access";
import {
  EMPTY_DOCUMENT_HTML,
  normalizeDocumentTitle,
  validateDocumentContent,
} from "@/lib/documents";
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

  const { id } = await context.params;

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
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  const access = await getDocumentAccess(id, result.user.id);

  if (access === "none") {
    return NextResponse.json(
      { error: "You do not have access to this document." },
      { status: 403 },
    );
  }

  return NextResponse.json({
    id: document.id,
    title: document.title,
    content: document.content || EMPTY_DOCUMENT_HTML,
    ownerId: document.ownerId,
    ownerName: document.owner.name,
    updatedAt: document.updatedAt.toISOString(),
    access,
    canEdit: access === "edit",
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const result = await requireUserId(request);

  if ("error" in result) {
    return result.error;
  }

  const { id } = await context.params;

  const existing = await prisma.document.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      content: true,
      updatedAt: true,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  const canEdit = await userCanEditDocument(id, result.user.id);

  if (!canEdit) {
    return NextResponse.json(
      { error: "You have view-only access to this document." },
      { status: 403 },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const updates: { title?: string; content?: string } = {};

  if ("title" in body) {
    if (typeof body.title !== "string") {
      return NextResponse.json(
        { error: "Title must be a string." },
        { status: 400 },
      );
    }

    const title = normalizeDocumentTitle(body.title);

    if (!title) {
      return NextResponse.json(
        { error: "Title cannot be empty." },
        { status: 400 },
      );
    }

    updates.title = title;
  }

  if ("content" in body) {
    if (typeof body.content !== "string") {
      return NextResponse.json(
        { error: "Content must be a string." },
        { status: 400 },
      );
    }

    const contentError = validateDocumentContent(body.content);

    if (contentError) {
      return NextResponse.json({ error: contentError }, { status: 400 });
    }

    updates.content = body.content;
  }

  if (!updates.title && updates.content === undefined) {
    return NextResponse.json(
      { error: "Provide a title and/or content to update." },
      { status: 400 },
    );
  }

  if (
    "expectedUpdatedAt" in body &&
    body.expectedUpdatedAt !== undefined &&
    body.expectedUpdatedAt !== null
  ) {
    if (typeof body.expectedUpdatedAt !== "string") {
      return NextResponse.json(
        { error: "expectedUpdatedAt must be a string." },
        { status: 400 },
      );
    }

    const currentUpdatedAt = existing.updatedAt.toISOString();

    if (body.expectedUpdatedAt !== currentUpdatedAt) {
      return NextResponse.json(
        {
          error:
            "This document was updated elsewhere. Reload the latest version and try again.",
          conflict: true,
          id: existing.id,
          title: existing.title,
          content: existing.content || EMPTY_DOCUMENT_HTML,
          updatedAt: currentUpdatedAt,
        },
        { status: 409 },
      );
    }
  }

  const document = await prisma.document.update({
    where: { id },
    data: updates,
    select: {
      id: true,
      title: true,
      content: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({
    id: document.id,
    title: document.title,
    content: document.content || EMPTY_DOCUMENT_HTML,
    updatedAt: document.updatedAt.toISOString(),
  });
}
