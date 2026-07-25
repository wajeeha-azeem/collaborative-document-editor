import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

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

  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: { id: true, ownerId: true },
  });

  if (!document) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  if (document.ownerId !== result.user.id) {
    return NextResponse.json(
      { error: "Only the owner can view document shares." },
      { status: 403 },
    );
  }

  const shares = await prisma.documentShare.findMany({
    where: { documentId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      user: { select: { id: true, name: true } },
      createdAt: true,
    },
  });

  return NextResponse.json({
    shares: shares.map((share) => ({
      id: share.id,
      userId: share.user.id,
      userName: share.user.name,
      createdAt: share.createdAt.toISOString(),
    })),
  });
}

export async function POST(request: Request, context: RouteContext) {
  const result = await requireUserId(request);

  if ("error" in result) {
    return result.error;
  }

  const { id: documentId } = await context.params;

  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: { id: true, ownerId: true },
  });

  if (!document) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  if (document.ownerId !== result.user.id) {
    return NextResponse.json(
      { error: "Only the owner can share this document." },
      { status: 403 },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null || !("userId" in body)) {
    return NextResponse.json(
      { error: "Provide a userId to share with." },
      { status: 400 },
    );
  }

  if (typeof body.userId !== "string" || body.userId.trim().length === 0) {
    return NextResponse.json(
      { error: "userId must be a non-empty string." },
      { status: 400 },
    );
  }

  const targetUserId = body.userId.trim();

  if (targetUserId === result.user.id) {
    return NextResponse.json(
      { error: "You cannot share a document with yourself." },
      { status: 400 },
    );
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, name: true },
  });

  if (!targetUser) {
    return NextResponse.json(
      { error: "The selected user was not found." },
      { status: 404 },
    );
  }

  try {
    const share = await prisma.documentShare.create({
      data: {
        documentId,
        userId: targetUser.id,
      },
      select: {
        id: true,
        createdAt: true,
        user: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(
      {
        id: share.id,
        userId: share.user.id,
        userName: share.user.name,
        createdAt: share.createdAt.toISOString(),
      },
      { status: 201 },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "This document is already shared with that user." },
        { status: 409 },
      );
    }

    throw error;
  }
}
