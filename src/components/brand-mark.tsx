import Link from "next/link";

import { cn } from "@/lib/utils";

type BrandMarkProps = {
  href?: string | null;
  className?: string;
  size?: "sm" | "lg";
};

export function BrandMark({
  href = "/",
  className,
  size = "sm",
}: BrandMarkProps) {
  const content = (
    <span
      className={cn(
        "inline-flex flex-wrap items-baseline justify-center gap-x-2 tracking-tight text-ink",
        size === "lg" ? "text-3xl sm:text-5xl" : "text-lg sm:text-xl",
        className,
      )}
    >
      <span className="font-display font-semibold">Collaborative Docs</span>
    </span>
  );

  if (!href) {
    return content;
  }

  return (
    <Link href={href} className="transition-opacity hover:opacity-80">
      {content}
    </Link>
  );
}
