import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function DocumentNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-8 px-6 py-16 text-center">
      <BrandMark href="/dashboard" />
      <div className="animate-app-fade-up space-y-3">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
          Document not found
        </h1>
        <p className="text-base leading-relaxed text-muted-foreground">
          This document doesn’t exist or is no longer available.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Link href="/dashboard" className={cn(buttonVariants())}>
          All documents
        </Link>
        <Link href="/" className={cn(buttonVariants({ variant: "outline" }))}>
          Switch user
        </Link>
      </div>
    </main>
  );
}
