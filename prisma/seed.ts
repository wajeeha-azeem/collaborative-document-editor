import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_USERS = ["Alice", "Bob"] as const;

async function main() {
  for (const name of DEMO_USERS) {
    await prisma.user.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  console.log("Seeded users:");
  for (const user of users) {
    console.log(`- ${user.name} (${user.id})`);
  }
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
