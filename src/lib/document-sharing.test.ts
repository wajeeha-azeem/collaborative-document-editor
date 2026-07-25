import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { userCanAccessDocument } from "@/lib/document-access";

// Relative to prisma/schema.prisma (same resolution as DATABASE_URL=file:./dev.db).
const TEST_DATABASE_URL = "file:./test.db";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: TEST_DATABASE_URL,
    },
  },
});

describe("document sharing", () => {
  beforeAll(async () => {
    const { execSync } = await import("node:child_process");

    // Creates/updates schema on the isolated test DB without resetting prod/dev data.
    execSync("npx prisma db push --skip-generate", {
      env: {
        ...process.env,
        DATABASE_URL: TEST_DATABASE_URL,
      },
      stdio: "pipe",
    });
  });

  beforeEach(async () => {
    await prisma.documentShare.deleteMany();
    await prisma.document.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("lets a shared user access a document and blocks duplicate shares", async () => {
    const alice = await prisma.user.create({ data: { name: "Alice" } });
    const bob = await prisma.user.create({ data: { name: "Bob" } });

    const document = await prisma.document.create({
      data: {
        title: "Shared notes",
        content: "<p>Hello</p>",
        ownerId: alice.id,
      },
    });

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

    expect(await userCanAccessDocument(document.id, bob.id, prisma)).toBe(true);

    await expect(
      prisma.documentShare.create({
        data: {
          documentId: document.id,
          userId: bob.id,
        },
      }),
    ).rejects.toMatchObject({ code: "P2002" });
  });
});
