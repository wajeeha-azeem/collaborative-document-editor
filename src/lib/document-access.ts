import type { PrismaClient } from "@prisma/client";

import { prisma } from "@/lib/prisma";

type DocumentAccessClient = Pick<PrismaClient, "document">;

export async function userCanAccessDocument(
  documentId: string,
  userId: string,
  db: DocumentAccessClient = prisma,
): Promise<boolean> {
  const document = await db.document.findUnique({
    where: { id: documentId },
    select: {
      ownerId: true,
      shares: {
        where: { userId },
        select: { id: true },
        take: 1,
      },
    },
  });

  if (!document) {
    return false;
  }

  return document.ownerId === userId || document.shares.length > 0;
}
