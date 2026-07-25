import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createDocumentVersion } from "@/lib/document-versions";

const databaseUrl = process.env.DATABASE_URL ?? "";
const isPostgres =
  /^postgres(ql)?:\/\//i.test(databaseUrl) &&
  !databaseUrl.includes("USER:PASSWORD") &&
  !/@HOST(?:\/|:|\?|$)/i.test(databaseUrl);

const prisma = new PrismaClient();
const TEST_MAX_VERSIONS = 3;

describe.skipIf(!isPostgres)("document versions", () => {
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
    "creates versions, skips exact duplicates, and caps history",
    async ({ skip }) => {
      if (!dbReady) {
        skip("Postgres database is unreachable from this environment.");
      }

      const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const owner = await prisma.user.create({
        data: { name: `Owner-version-${suffix}` },
      });
      const document = await prisma.document.create({
        data: {
          title: "Versioned notes",
          content: "<p>v1</p>",
          ownerId: owner.id,
        },
      });

      try {
        const first = await createDocumentVersion(
          {
            documentId: document.id,
            title: "Versioned notes",
            content: "<p>v1</p>",
            createdById: owner.id,
            maxVersions: TEST_MAX_VERSIONS,
          },
          prisma,
        );
        expect(first).not.toBeNull();

        const duplicate = await createDocumentVersion(
          {
            documentId: document.id,
            title: "Versioned notes",
            content: "<p>v1</p>",
            createdById: owner.id,
            maxVersions: TEST_MAX_VERSIONS,
          },
          prisma,
        );
        expect(duplicate).toBeNull();

        for (let index = 0; index < TEST_MAX_VERSIONS; index += 1) {
          const created = await createDocumentVersion(
            {
              documentId: document.id,
              title: `Checkpoint ${index}`,
              content: `<p>overflow-${index}</p>`,
              createdById: owner.id,
              maxVersions: TEST_MAX_VERSIONS,
            },
            prisma,
          );
          expect(created).not.toBeNull();
        }

        const count = await prisma.documentVersion.count({
          where: { documentId: document.id },
        });
        expect(count).toBe(TEST_MAX_VERSIONS);
      } finally {
        await prisma.documentVersion.deleteMany({
          where: { documentId: document.id },
        });
        await prisma.document.deleteMany({ where: { id: document.id } });
        await prisma.user.deleteMany({ where: { id: owner.id } });
      }
    },
    30_000,
  );
});
