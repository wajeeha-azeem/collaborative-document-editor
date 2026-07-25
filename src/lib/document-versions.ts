import type { PrismaClient } from "@prisma/client";

import { EMPTY_DOCUMENT_HTML } from "@/lib/documents";
import { prisma } from "@/lib/prisma";

export const MAX_DOCUMENT_VERSIONS = 40;

type SnapshotInput = {
  documentId: string;
  title: string;
  content: string;
  createdById: string;
  /** Override retention cap (tests). Defaults to MAX_DOCUMENT_VERSIONS. */
  maxVersions?: number;
};

type VersionClient = Pick<PrismaClient, "documentVersion">;

/**
 * Creates an explicit version snapshot (used by "Save version").
 * Skips if it would duplicate the latest snapshot exactly.
 */
export async function createDocumentVersion(
  { documentId, title, content, createdById, maxVersions }: SnapshotInput,
  db: VersionClient = prisma,
): Promise<{ id: string } | null> {
  const normalizedContent = content || EMPTY_DOCUMENT_HTML;
  const retention = maxVersions ?? MAX_DOCUMENT_VERSIONS;

  const latest = await db.documentVersion.findFirst({
    where: { documentId },
    orderBy: { createdAt: "desc" },
    select: {
      title: true,
      content: true,
    },
  });

  if (
    latest &&
    latest.title === title &&
    (latest.content || EMPTY_DOCUMENT_HTML) === normalizedContent
  ) {
    return null;
  }

  const version = await db.documentVersion.create({
    data: {
      documentId,
      title,
      content: normalizedContent,
      createdById,
    },
    select: { id: true },
  });

  const overflow = await db.documentVersion.findMany({
    where: { documentId },
    orderBy: { createdAt: "desc" },
    skip: retention,
    select: { id: true },
  });

  if (overflow.length > 0) {
    await db.documentVersion.deleteMany({
      where: { id: { in: overflow.map((row) => row.id) } },
    });
  }

  return version;
}
