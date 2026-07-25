import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { userCanAccessDocument } from "@/lib/document-access";

const databaseUrl = process.env.DATABASE_URL ?? "";
const isPostgres =
  /^postgres(ql)?:\/\//i.test(databaseUrl) &&
  !databaseUrl.includes("USER:PASSWORD") &&
  !/@HOST(?:\/|:|\?|$)/i.test(databaseUrl);


const prisma = new PrismaClient();

describe.skipIf(!isPostgres)("document sharing", () => {
  beforeAll(async () => {
    const { execSync } = await import("node:child_process");

    execSync("npx prisma db push --skip-generate", {
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
      },
      stdio: "pipe",
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("lets a shared user access a document and blocks duplicate shares", async () => {
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
      expect(await userCanAccessDocument(document.id, bob.id, prisma)).toBe(
        false,
      );

      await prisma.documentShare.create({
        data: {
          documentId: document.id,
          userId: bob.id,
        },
      });

      expect(await userCanAccessDocument(document.id, bob.id, prisma)).toBe(
        true,
      );

      await expect(
        prisma.documentShare.create({
          data: {
            documentId: document.id,
            userId: bob.id,
          },
        }),
      ).rejects.toMatchObject({ code: "P2002" });
    } finally {
      await prisma.documentShare.deleteMany({
        where: { documentId: document.id },
      });
      await prisma.document.deleteMany({ where: { id: document.id } });
      await prisma.user.deleteMany({
        where: { id: { in: [alice.id, bob.id] } },
      });
    }
  });
});
