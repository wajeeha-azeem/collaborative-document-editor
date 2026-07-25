import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-8 px-6 py-16 text-center">
      <BrandMark href="/" />
      <div className="animate-app-fade-up space-y-3">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
          Page not found
        </h1>
        <p className="text-base leading-relaxed text-muted-foreground">
          The link may be broken, or the document may have been removed.
        </p>
      </div>
      <Link href="/dashboard" className={cn(buttonVariants())}>
        Back to documents
      </Link>
    </main>
  );
}
