import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  getDocumentAccess,
  userCanAccessDocument,
  userCanEditDocument,
} from "@/lib/document-access";

const databaseUrl = process.env.DATABASE_URL ?? "";
const isPostgres =
  /^postgres(ql)?:\/\//i.test(databaseUrl) &&
  !databaseUrl.includes("USER:PASSWORD") &&
  !/@HOST(?:\/|:|\?|$)/i.test(databaseUrl);

const prisma = new PrismaClient();

describe.skipIf(!isPostgres)("document sharing", () => {
  let dbReady = false;

  beforeAll(async () => {
    const { execSync } = await import("node:child_process");

    try {
      execSync("npx prisma db push --skip-generate", {
        env: {
          ...process.env,
          DATABASE_URL: databaseUrl,
        },
        stdio: "pipe",
        timeout: 20_000,
      });
      dbReady = true;
    } catch {
      dbReady = false;
    }
  }, 25_000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it(
    "enforces view vs edit roles and blocks duplicate shares",
    async ({ skip }) => {
      if (!dbReady) {
        skip("Postgres database is unreachable from this environment.");
      }
      const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const alice = await prisma.user.create({
        data: { name: `Alice-test-${suffix}` },
      });
      const bob = await prisma.user.create({
        data: { name: `Bob-test-${suffix}` },
      });

      const document = await prisma.document.create({
        data: {
          title: "Shared notes",
          content: "<p>Hello</p>",
          ownerId: alice.id,
        },
      });

      try {
        expect(await userCanAccessDocument(document.id, alice.id, prisma)).toBe(
          true,
        );
        expect(await userCanEditDocument(document.id, alice.id, prisma)).toBe(
          true,
        );
        expect(await userCanAccessDocument(document.id, bob.id, prisma)).toBe(
          false,
        );

        await prisma.documentShare.create({
          data: {
            documentId: document.id,
            userId: bob.id,
            role: "VIEW",
          },
        });

        expect(await getDocumentAccess(document.id, bob.id, prisma)).toBe(
          "view",
        );
        expect(await userCanAccessDocument(document.id, bob.id, prisma)).toBe(
          true,
        );
        expect(await userCanEditDocument(document.id, bob.id, prisma)).toBe(
          false,
        );

        await prisma.documentShare.update({
          where: {
            documentId_userId: {
              documentId: document.id,
              userId: bob.id,
            },
          },
          data: { role: "EDIT" },
        });

        expect(await getDocumentAccess(document.id, bob.id, prisma)).toBe(
          "edit",
        );
        expect(await userCanEditDocument(document.id, bob.id, prisma)).toBe(
          true,
        );

        await expect(
          prisma.documentShare.create({
            data: {
              documentId: document.id,
              userId: bob.id,
              role: "VIEW",
            },
          }),
        ).rejects.toMatchObject({ code: "P2002" });
      } finally {
        await prisma.documentShare.deleteMany({
          where: { documentId: document.id },
        });
        await prisma.documentVersion.deleteMany({
          where: { documentId: document.id },
        });
        await prisma.document.deleteMany({ where: { id: document.id } });
        await prisma.user.deleteMany({
          where: { id: { in: [alice.id, bob.id] } },
        });
      }
    },
    30_000,
  );
});

