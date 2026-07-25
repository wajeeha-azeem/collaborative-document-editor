import type { PrismaClient } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type { ShareRole } from "@/lib/share-role";
export { isShareRole, shareRoleLabel } from "@/lib/share-role";

export type DocumentAccessLevel = "none" | "view" | "edit";

type DocumentAccessClient = Pick<PrismaClient, "document">;

export async function getDocumentAccess(
  documentId: string,
  userId: string,
  db: DocumentAccessClient = prisma,
): Promise<DocumentAccessLevel> {
  const document = await db.document.findUnique({
    where: { id: documentId },
    select: {
      ownerId: true,
      shares: {
        where: { userId },
        select: { role: true },
        take: 1,
      },
    },
  });

  if (!document) {
    return "none";
  }

  if (document.ownerId === userId) {
    return "edit";
  }

  const share = document.shares[0];

  if (!share) {
    return "none";
  }

  return share.role === "EDIT" ? "edit" : "view";
}

export async function userCanAccessDocument(
  documentId: string,
  userId: string,
  db: DocumentAccessClient = prisma,
): Promise<boolean> {
  const access = await getDocumentAccess(documentId, userId, db);
  return access !== "none";
}

export async function userCanEditDocument(
  documentId: string,
  userId: string,
  db: DocumentAccessClient = prisma,
): Promise<boolean> {
  const access = await getDocumentAccess(documentId, userId, db);
  return access === "edit";
}
