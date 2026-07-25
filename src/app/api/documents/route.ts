import { NextResponse } from "next/server";

import {
  DEFAULT_DOCUMENT_TITLE,
  EMPTY_DOCUMENT_HTML,
  normalizeDocumentTitle,
  validateDocumentContent,
} from "@/lib/documents";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/request-user";

export async function GET(request: Request) {
  const result = await requireUserId(request);

  if ("error" in result) {
    return result.error;
  }

  const [ownedDocuments, sharedRows] = await Promise.all([
    prisma.document.findMany({
      where: { ownerId: result.user.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        updatedAt: true,
      },
    }),
    prisma.documentShare.findMany({
      where: { userId: result.user.id },
      orderBy: { document: { updatedAt: "desc" } },
      select: {
        role: true,
        document: {
          select: {
            id: true,
            title: true,
            updatedAt: true,
            owner: { select: { name: true } },
          },
        },
      },
    }),
  ]);

  return NextResponse.json({
    owned: ownedDocuments.map((document) => ({
      id: document.id,
      title: document.title,
      updatedAt: document.updatedAt.toISOString(),
    })),
    shared: sharedRows.map(({ document, role }) => ({
      id: document.id,
      title: document.title,
      updatedAt: document.updatedAt.toISOString(),
      ownerName: document.owner.name,
      role,
      canEdit: role === "EDIT",
    })),
  });
}

export async function POST(request: Request) {
  const result = await requireUserId(request);

  if ("error" in result) {
    return result.error;
  }

  let title = DEFAULT_DOCUMENT_TITLE;
  let content = "";

  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    if (typeof body === "object" && body !== null) {
      if ("title" in body && body.title !== undefined) {
        if (typeof body.title !== "string") {
          return NextResponse.json(
            { error: "Title must be a string." },
            { status: 400 },
          );
        }

        const normalizedTitle = normalizeDocumentTitle(body.title);

        if (!normalizedTitle) {
          return NextResponse.json(
            { error: "Title cannot be empty." },
            { status: 400 },
          );
        }

        title = normalizedTitle;
      }

      if ("content" in body && body.content !== undefined) {
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

        content = body.content.trim() ? body.content : EMPTY_DOCUMENT_HTML;
      }
    }
  }

  const document = await prisma.document.create({
    data: {
      title,
      content,
      ownerId: result.user.id,
    },
    select: {
      id: true,
      title: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(
    {
      id: document.id,
      title: document.title,
      updatedAt: document.updatedAt.toISOString(),
    },
    { status: 201 },
  );
}
