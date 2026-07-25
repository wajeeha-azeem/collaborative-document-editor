import { BrandMark } from "@/components/brand-mark";
import { UserSelection } from "@/components/user-selection";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function Home() {
  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <main className="relative flex flex-1 flex-col items-center justify-center px-6 py-16 sm:py-24">
      <div className="flex w-full max-w-md flex-col gap-10">
        <div className="animate-app-fade-up space-y-4 text-center">
          <BrandMark href={null} size="lg" className="justify-center" />
          <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
            Create, edit, and share documents. Pick a demo person to get
            started — no password needed.
          </p>
        </div>

        <div className="animate-app-fade-up animate-app-delay-1">
          <UserSelection users={users} />
        </div>
      </div>
    </main>
  );
}
