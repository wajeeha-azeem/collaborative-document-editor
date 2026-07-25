"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight } from "lucide-react";

import {
  notifyUserSessionChange,
  useCurrentUser,
} from "@/hooks/use-current-user";
import { writeUserSession } from "@/lib/user-session";
import { cn } from "@/lib/utils";

type SelectableUser = {
  id: string;
  name: string;
};

type UserSelectionProps = {
  users: SelectableUser[];
};

const USER_ACCENTS = [
  "bg-[oklch(0.88_0.05_200)] text-[oklch(0.32_0.06_220)]",
  "bg-[oklch(0.9_0.04_250)] text-[oklch(0.35_0.06_250)]",
];

export function UserSelection({ users }: UserSelectionProps) {
  const router = useRouter();
  const storedUser = useCurrentUser();
  const [enteringId, setEnteringId] = useState<string | null>(null);
  const currentUser =
    storedUser && users.some((user) => user.id === storedUser.id)
      ? storedUser
      : null;

  function enterAs(user: SelectableUser) {
    setEnteringId(user.id);
    writeUserSession({ id: user.id, name: user.name });
    notifyUserSessionChange();
    router.push("/dashboard");
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <p className="text-center text-sm text-muted-foreground">
        Choose who to open the app as.
      </p>

      <ul className="grid gap-3" aria-label="Demo users">
        {users.map((user, index) => {
          const isCurrent = currentUser?.id === user.id;
          const isEntering = enteringId === user.id;
          const accent = USER_ACCENTS[index % USER_ACCENTS.length];

          return (
            <li key={user.id}>
              <button
                type="button"
                disabled={enteringId !== null}
                onClick={() => enterAs(user)}
                className={cn(
                  "group flex w-full items-center gap-4 rounded-2xl border px-4 py-4 text-left transition-all duration-200",
                  "hover:-translate-y-0.5 hover:border-primary/35 hover:bg-card",
                  "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
                  "disabled:pointer-events-none disabled:opacity-70",
                  isCurrent
                    ? "border-primary/40 bg-card shadow-[0_12px_30px_oklch(0.4_0.04_230/0.1)]"
                    : "border-border/80 bg-card/70",
                )}
              >
                <span
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-xl text-base font-semibold",
                    accent,
                  )}
                  aria-hidden
                >
                  {user.name.slice(0, 1)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-foreground">
                    Continue as {user.name}
                  </span>
                  <span className="block text-sm text-muted-foreground">
                    {isCurrent
                      ? "Pick up where you left off"
                      : "Open the documents and shares"}
                  </span>
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-sm font-medium text-primary transition-transform group-hover:translate-x-0.5",
                  )}
                >
                  {isEntering ? "Opening…" : "Enter"}
                  {!isEntering ? (
                    <ArrowRight className="size-4" aria-hidden />
                  ) : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {users.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">
          No users found. Run <code className="font-mono">npm run db:seed</code>{" "}
          and refresh.
        </p>
      ) : null}
    </div>
  );
}
